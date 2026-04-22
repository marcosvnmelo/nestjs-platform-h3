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

/**
 * Extract Node.js request from H3 event
 * @internal
 */
export function extractNodeRequestFromEvent(event: H3Event): H3ServerRequest {
  if (!event.runtime?.node?.req) {
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
 * Extract Node.js request and response from H3 event
 * @internal
 */
export function extractNodeRuntimeFromEvent<
  TRequest extends H3ServerRequest,
  TResponse extends H3ServerResponse,
>(event: H3Event): [TRequest, TResponse] {
  return [
    extractNodeRequestFromEvent(event) as TRequest,
    extractNodeResponseFromEvent(event) as TResponse,
  ];
}

/**
 * Fills the request object with data from the H3 event.
 * These values are used by the NestJS decorators.
 * @internal
 */
export function applyParamsToRequest(request: H3ServerRequest, event: H3Event) {
  // Extract route parameters from H3 context and attach to request
  // This makes them available to NestJS @Param() decorators
  (request as PolyfilledRequest<H3ServerRequest>).params = getRouterParams(
    event,
    { decode: true },
  );

  // Extract query parameters from H3 context and attach to request
  // This makes them available to NestJS @Query() decorators
  (request as PolyfilledRequest<H3ServerRequest>).query = getQuery(event);
}

/**
 * Add Express-like polyfill methods to the response object for compatibility
 * with NestJS middleware and decorators that expect an Express-like API.
 */
export function applyExpressPolyfills(response: H3ServerResponse): void {
  function setCharset(type: string, charset: string) {
    if (!type || !charset) {
      return type;
    }

    // parse type
    const parsed = contentType.parse(type);

    // set charset
    parsed.parameters.charset = charset;

    // format type
    return contentType.format(parsed);
  }

  (response as PolyfilledResponse<H3ServerResponse>).contentType ??= (
    response as PolyfilledResponse<H3ServerResponse>
  ).type ??= function contentType(
    this: PolyfilledResponse<H3ServerResponse>,
    type: string,
  ) {
    const ct =
      type.indexOf('/') === -1
        ? mime.contentType(type) || 'application/octet-stream'
        : type;

    return this.set('Content-Type', ct);
  };

  (response as PolyfilledResponse<H3ServerResponse>).get ??= function get(
    this: PolyfilledResponse<H3ServerResponse>,
    name: string,
  ) {
    return this.getHeader(name);
  };

  (response as PolyfilledResponse<H3ServerResponse>).set ??= (
    response as PolyfilledResponse<H3ServerResponse>
  ).header = function header(
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

  (response as PolyfilledResponse<H3ServerResponse>).send ??= function send(
    this: PolyfilledResponse<H3ServerResponse>,
    body: any,
  ) {
    let chunk = body;
    let encoding: BufferEncoding | undefined;
    const req = this.req;

    switch (typeof chunk) {
      // string defaulting to html
      case 'string': {
        encoding = 'utf8';
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
      if (encoding) this.end(chunk, encoding);
      else this.end(chunk);
    }

    return this;
  };

  (response as PolyfilledResponse<H3ServerResponse>).json ??= function json(
    this: PolyfilledResponse<H3ServerResponse>,
    obj,
  ) {
    const body = JSON.stringify(obj);

    // content-type
    if (this.get('Content-Type') !== 'application/json') {
      this.set('Content-Type', 'application/json');
    }

    return this.send(body);
  };

  // Initialize statusCode to 200 if not already set and headers not sent
  if (
    !(response as PolyfilledResponse<H3ServerResponse>).headersSent &&
    !(response as PolyfilledResponse<H3ServerResponse>).writableEnded &&
    typeof (response as PolyfilledResponse<H3ServerResponse>).statusCode !==
      'number'
  ) {
    (response as PolyfilledResponse<H3ServerResponse>).statusCode = 200;
  }

  (response as PolyfilledResponse<H3ServerResponse>).status ??= function status(
    this: PolyfilledResponse<H3ServerResponse>,
    code,
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
}
