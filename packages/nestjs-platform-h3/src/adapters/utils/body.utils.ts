import type { OptionsJson, OptionsUrlencoded } from 'body-parser';
import type { H3Event } from 'h3';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
  let o: OptionsJson = {};
  if (rawBody === true) {
    o = { ...o, verify: verifyRawBody };
  }
  return o;
}

export function getUrlencodedBodyParserOptions(
  rawBody: boolean | undefined,
): OptionsUrlencoded {
  let o: OptionsUrlencoded = { extended: true };
  if (rawBody === true) {
    o = { ...o, verify: verifyRawBody };
  }
  return o;
}

function runBodyParsersInSequence(
  nodeReq: IncomingMessage,
  nodeRes: ServerResponse,
  jsonParser: (
    req: IncomingMessage,
    res: ServerResponse,
    callback: (err?: any) => void,
  ) => void,
  urlencodedParser: (
    req: IncomingMessage,
    res: ServerResponse,
    callback: (err?: any) => void,
  ) => void,
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
    jsonParser: ReturnType<typeof bodyParser.json>;
    urlencodedParser: ReturnType<typeof bodyParser.urlencoded>;
  },
): Promise<void> {
  const jsonParser =
    parsers?.jsonParser ?? bodyParser.json(getJsonBodyParserOptions(rawBody));
  const urlencodedParser =
    parsers?.urlencodedParser ??
    bodyParser.urlencoded(getUrlencodedBodyParserOptions(rawBody));
  const h3req = extractNodeRequestFromEvent(event);
  const h3res = extractNodeResponseFromEvent(event);
  const nodeReq = h3req as unknown as IncomingMessage;
  const nodeRes = h3res as unknown as ServerResponse;
  await runBodyParsersInSequence(
    nodeReq,
    nodeRes,
    jsonParser,
    urlencodedParser,
  );
  setH3ParsedBody(
    (h3req as PolyfilledRequest<H3ServerRequest>).body,
    event,
    rawBody,
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
