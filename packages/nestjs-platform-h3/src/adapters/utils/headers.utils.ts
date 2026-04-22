import type { H3Event } from 'h3';

import type { H3ServerResponse } from '../../interfaces/nest-h3-application.interface.ts';

/**
 * Copy headers from H3 event to response.
 * This is used to copy headers from the H3 event to the response.
 * @internal
 */
export function copyHeadersFromEvent(
  event: H3Event,
  response: H3ServerResponse,
) {
  event.res.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });
}
