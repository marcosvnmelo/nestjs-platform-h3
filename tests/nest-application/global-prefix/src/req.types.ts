import type { H3ServerRequest } from '@marcosvnmelo/nestjs-platform-h3';

/** H3/Node request extended by this test module’s middleware. */
export type GlobalPrefixRequest = H3ServerRequest & {
  extras?: { data: string };
  count?: number;
  middlewareParams?: unknown;
  params?: Record<string, string>;
};
