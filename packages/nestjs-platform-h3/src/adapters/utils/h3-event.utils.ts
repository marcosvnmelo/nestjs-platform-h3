import type { H3Event } from 'h3';

import type {
  H3ServerRequest,
  PolyfilledRequest,
} from '../../interfaces/nest-h3-application.interface.ts';
import { $h3Event } from './symbols.utils.ts';

/**
 * Attach H3 event to Node request
 * @internal
 */
export function setH3Event(request: H3ServerRequest, event: H3Event): void {
  (request as PolyfilledRequest<H3ServerRequest>)[$h3Event] = event;
}

/**
 * Extract H3 event from Node request
 * @internal
 */
export function extractH3Event(request: H3ServerRequest): H3Event {
  return (request as PolyfilledRequest<H3ServerRequest>)[$h3Event];
}
