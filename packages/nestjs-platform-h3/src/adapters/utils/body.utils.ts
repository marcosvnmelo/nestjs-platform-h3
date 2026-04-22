import type { H3Event } from 'h3';

import type { RawBodyRequest } from '@nestjs/common';

import type {
  H3ServerRequest,
  PolyfilledRequest,
} from '../../interfaces/nest-h3-application.interface.ts';
import { extractNodeRequestFromEvent } from '../../adapters/utils/node-runtime.utils.ts';

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
  const reqBody = event.req.body;

  req.body = body;
  if (rawBody && Buffer.isBuffer(reqBody)) {
    req.rawBody = reqBody;
  }
}

/**
 * Extract parsed body from Node request
 * @internal
 */
export function extractH3ParsedBody(request: H3ServerRequest): any {
  return (request as PolyfilledRequest<H3ServerRequest>).body;
}
