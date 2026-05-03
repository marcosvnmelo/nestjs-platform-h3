import { buffer } from 'node:stream/consumers';
import type { OptionsJson, OptionsUrlencoded } from 'body-parser';
import type { H3Event } from 'h3';
import type http from 'node:http';
import bodyParser from 'body-parser';

import type { RawBodyRequest } from '@nestjs/common';

import type {
  H3ServerRequest,
  PolyfilledRequest,
} from '../../interfaces/nest-h3-application.interface.ts';
import {
  extractNodeRequestFromEvent,
  extractNodeResponseFromEvent,
} from '../../adapters/utils/node-runtime.utils.ts';
import { extractH3Event } from './h3-event.utils.ts';

export type NextHandleFunction = ReturnType<typeof bodyParser.urlencoded>;

/** Same as `getBodyParserOptions` in `@nestjs/platform-express` (raw body capture). */
const verifyRawBody: NonNullable<OptionsJson['verify']> = (
  req,
  _res,
  buffer,
) => {
  if (Buffer.isBuffer(buffer)) {
    (req as RawBodyRequest<PolyfilledRequest<H3ServerRequest>>).rawBody =
      buffer;
  }
  return true;
};

export function getJsonBodyParserOptions(
  rawBody: boolean | undefined,
): OptionsJson {
  const o: OptionsJson = {};
  if (rawBody === true) {
    o.verify = verifyRawBody;
  }
  return o;
}

export function getUrlencodedBodyParserOptions(
  rawBody: boolean | undefined,
): OptionsUrlencoded {
  const o: OptionsUrlencoded = { extended: true };
  if (rawBody === true) {
    o.verify = verifyRawBody;
  }
  return o;
}

export function h3JsonParserFactory(
  rawBody: boolean | undefined,
): NextHandleFunction {
  return async (req, res, next) => {
    try {
      const event = extractH3Event(req);

      if (event.req.headers.get('content-type') !== 'application/json') {
        next();
        return;
      }

      let rawBodyBuffer: Buffer | undefined;

      if (rawBody && event.req.body) {
        rawBodyBuffer = await buffer(event.req.body);
      }

      if (rawBodyBuffer)
        (req as PolyfilledRequest<H3ServerRequest>).body = JSON.parse(
          rawBodyBuffer.toString() || '{}',
        );
      else
        (req as PolyfilledRequest<H3ServerRequest>).body =
          await event.req.json();

      if (rawBodyBuffer) {
        verifyRawBody(req, res, rawBodyBuffer, 'utf8');
      }

      next();
    } catch {
      next();
    }
  };
}

function runBodyParsersInSequence(
  nodeReq: http.IncomingMessage,
  nodeRes: http.ServerResponse,
  jsonParser: NextHandleFunction,
  urlencodedParser: NextHandleFunction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    jsonParser(nodeReq, nodeRes, (err) => {
      if (err) return reject(err);
      urlencodedParser(nodeReq, nodeRes, (err2) => {
        if (err2) reject(err2);
        else resolve();
      });
    });
  });
}

/**
 * Run the same `json` + `urlencoded` stack as
 * `ExpressAdapter#registerParserMiddleware` and attach the result to the
 * polyfilled request (same as `@nestjs/platform-express`).
 */
export async function applyExpressCompatibleBodyParsers(
  event: H3Event,
  rawBody?: boolean,
  parsers?: {
    jsonParser: NextHandleFunction;
    urlencodedParser: NextHandleFunction;
  },
): Promise<void> {
  const jsonParser =
    parsers?.jsonParser ?? bodyParser.json(getJsonBodyParserOptions(rawBody));
  const urlencodedParser =
    parsers?.urlencodedParser ??
    bodyParser.urlencoded(getUrlencodedBodyParserOptions(rawBody));

  const req = extractNodeRequestFromEvent(event);
  const res = extractNodeResponseFromEvent(event);

  await runBodyParsersInSequence(
    req as http.IncomingMessage,
    res as http.ServerResponse,
    jsonParser,
    urlencodedParser,
  );
}

/**
 * Attach parsed body to Node request
 * @internal
 */
export function setH3ParsedBody(
  body: unknown,
  event: H3Event,
  rawBody?: boolean,
): void {
  const req = extractNodeRequestFromEvent(event) as RawBodyRequest<
    PolyfilledRequest<H3ServerRequest>
  >;
  const webBody = event.req.body;

  req.body = body;
  if (rawBody) {
    if (!Buffer.isBuffer(req.rawBody) && Buffer.isBuffer(webBody)) {
      req.rawBody = webBody;
    }
  }
}

/**
 * Extract parsed body from Node request
 * @internal
 */
export function extractH3ParsedBody(request: H3ServerRequest): any {
  return (request as PolyfilledRequest<H3ServerRequest>).body;
}
