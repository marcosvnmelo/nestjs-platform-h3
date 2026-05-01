import type { H3Event } from 'h3';
import contentType from 'content-type';
import { getQuery, getRouterParams } from 'h3';
import mime from 'mime-types';

import type {
  H3ServerRequest,
  H3ServerResponse,
  PolyfilledRequest,
  PolyfilledResponse,
} from '../../interfaces/nest-h3-application.interface.ts';
import { extractH3Event } from './h3-event.utils.ts';

/**
 * Extract Node.js request from H3 event
 * @internal
 */
export function extractNodeRequestFromEvent(event: H3Event): H3ServerRequest {
  if (!event.runtime?.node) {
    throw new Error('Node.js runtime not available');
  }

  return event.runtime.node.req;
}

/**
 * Extract Node.js response from H3 event
 * @internal
 */
export function extractNodeResponseFromEvent(event: H3Event): H3ServerResponse {
  if (!event.runtime?.node?.res) {
    throw new Error('Node.js runtime not available');
  }

  return event.runtime.node.res;
}

/**
 * Extract remaining path segments after parameter matching
 * For a route pattern like /api/:tenantId/params with URL /api/test/params,
 * extract the literal segments that follow the parameters: ['params']
 * @internal
 */
export function extractRemainingPath(routePattern: string): string[] {
  if (!routePattern) return [];

  const pattern =
    routePattern.endsWith('/') && routePattern !== '/'
      ? routePattern.slice(0, -1)
      : routePattern;

  // Split pattern into segments
  const segments = pattern.split('/').filter(Boolean);
  const remaining: string[] = [];

  // Find the last parameter segment
  let lastParamIndex = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].startsWith(':')) {
      lastParamIndex = i;
      break;
    }
  }

  // Collect only literal segments after the last parameter
  for (let i = lastParamIndex + 1; i < segments.length; i++) {
    if (!segments[i].startsWith(':')) {
      remaining.push(segments[i]);
    }
  }

  return remaining;
}

const $paramsCache = Symbol('params cache');

const paramsDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  get: function (
    this: PolyfilledRequest<H3ServerRequest> & {
      [$paramsCache]?: PolyfilledRequest<H3ServerRequest>['params'];
    },
  ) {
    if (this[$paramsCache]) return this[$paramsCache];

    const event = extractH3Event(this);

    const params: Record<string, string | string[]> = getRouterParams(event, {
      decode: true,
    });

    const remainingPath = event.context.matchedRoute?.meta?.remainingPath as
      | string[]
      | null;
    if (remainingPath?.length) {
      params.path = remainingPath;
    }

    this[$paramsCache] = params;
    return params;
  },
};

const $queryCache = Symbol('query cache');

const queryDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  get: function (
    this: PolyfilledRequest<H3ServerRequest> & {
      [$queryCache]?: PolyfilledRequest<H3ServerRequest>['query'];
    },
  ) {
    if (this[$queryCache]) return this[$queryCache];

    const event = extractH3Event(this);

    const query = getQuery(event);

    this[$queryCache] = query as PolyfilledRequest<H3ServerRequest>['query'];
    return query;
  },
};

const extendedRequestProps = {
  params: paramsDescriptor,
  query: queryDescriptor,
};

/**
 * Fills the request object prototype with data from the H3 event.
 * These values are used by the NestJS decorators.
 * @internal
 */
export function applyParamsToRequest(req: H3ServerRequest) {
  Object.defineProperties(req, extendedRequestProps);
}

function setCharset(type: string, charset: string) {
  if (!type || !charset) {
    return type;
  }
  if (/;\s*charset=/i.test(type)) {
    return type;
  }

  let parsed;
  try {
    // parse type
    parsed = contentType.parse(type);
  } catch {
    return type;
  }

  // set charset
  parsed.parameters.charset = charset;

  // format type
  return contentType.format(parsed);
}

const type = function (
  this: PolyfilledResponse<H3ServerResponse>,
  type: string,
) {
  const ct =
    type.indexOf('/') === -1
      ? mime.contentType(type) || 'application/octet-stream'
      : type;
  return this.set('Content-Type', ct);
};

const get = function (
  this: PolyfilledResponse<H3ServerResponse>,
  name: string,
) {
  return this.getHeader(name);
};

const set = function (
  this: PolyfilledResponse<H3ServerResponse>,
  ...args: [string, string] | [Record<string, string>]
) {
  const [field, val] = args;
  if (typeof field === 'string') {
    let value = Array.isArray(val) ? val.map(String) : String(val);

    // add charset to content-type
    if (field.toLowerCase() === 'content-type') {
      if (Array.isArray(value)) {
        throw new TypeError('Content-Type cannot be set to an Array');
      }
      value = String(mime.contentType(value));
    }

    this.setHeader(field, value);
  } else {
    for (const key in field) {
      this.set(key, field[key]);
    }
  }
  return this;
};

const send = function (this: PolyfilledResponse<H3ServerResponse>, body: any) {
  let chunk = body;
  let encoding: BufferEncoding | undefined;
  let isStringChunk = false;
  const req = this.req;

  switch (typeof chunk) {
    // string defaulting to html
    case 'string': {
      encoding = 'utf8';
      isStringChunk = true;
      const type = this.get('Content-Type');

      if (typeof type === 'string') {
        this.set('Content-Type', setCharset(type, 'utf-8'));
      } else {
        this.type('html');
      }
      break;
    }
    case 'boolean':
    case 'number':
    case 'object':
      if (chunk === null) {
        chunk = '';
      } else if (ArrayBuffer.isView(chunk)) {
        if (!this.get('Content-Type')) {
          this.type('bin');
        }
      } else {
        return this.json(chunk);
      }
      break;
  }

  // populate Content-Length
  let len;
  if (chunk !== undefined) {
    if (Buffer.isBuffer(chunk)) {
      // get length of Buffer
      len = chunk.length;
    } else if (isStringChunk) {
      len = Buffer.byteLength(chunk, encoding);
    } else {
      // convert chunk to Buffer and calculate
      encoding = undefined;
      chunk = Buffer.from(chunk, encoding);
      len = chunk.length;
    }

    this.set('Content-Length', len);
  }

  // strip irrelevant headers
  if (204 === this.statusCode || 304 === this.statusCode) {
    this.removeHeader('Content-Type');
    this.removeHeader('Content-Length');
    this.removeHeader('Transfer-Encoding');
    chunk = '';
  }

  // alter headers for 205
  if (this.statusCode === 205) {
    this.set('Content-Length', '0');
    this.removeHeader('Transfer-Encoding');
    chunk = '';
  }

  if (req.method === 'HEAD') {
    // skip body for HEAD
    this.end();
  } else {
    // respond
    if (isStringChunk && encoding) this.end(chunk, encoding);
    else if (encoding) this.end(chunk, encoding);
    else this.end(chunk);
  }

  return this;
};

const json = function (this: PolyfilledResponse<H3ServerResponse>, obj: any) {
  const body = JSON.stringify(obj);

  const contentTypeValue = this.getHeader('Content-Type');
  if (
    typeof contentTypeValue !== 'string' ||
    !contentTypeValue.startsWith('application/json')
  ) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  return this.send(body);
};

const status = function (
  this: PolyfilledResponse<H3ServerResponse>,
  code: number,
) {
  // Check if the status code is not an integer
  if (!Number.isInteger(code)) {
    throw new TypeError(
      `Invalid status code: ${JSON.stringify(code)}. Status code must be an integer.`,
    );
  }
  // Check if the status code is outside of Node's valid range
  if (code < 100 || code > 999) {
    throw new RangeError(
      `Invalid status code: ${JSON.stringify(code)}. Status code must be greater than 99 and less than 1000.`,
    );
  }

  if (!this.headersSent) {
    this.statusCode = code;
  }
  return this;
};

const responseExtendedProps = {
  contentType: type,
  type: type,

  get: get,

  set: set,
  header: set,

  send: send,

  json: json,

  status: status,
};

/**
 * Add Express-like polyfill methods to the response object for compatibility
 * with NestJS middleware and decorators that expect an Express-like API.
 */
export function applyExpressPolyfills(res: H3ServerResponse) {
  Object.assign(res, responseExtendedProps);
}
