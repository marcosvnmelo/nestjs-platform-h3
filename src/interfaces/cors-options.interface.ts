import type { CorsOptions } from 'h3';

import type { H3ServerRequest } from './nest-h3-application.interface.ts';

export type { CorsOptions } from 'h3';

export interface CorsOptionsCallback {
  (error: Error | null, options: CorsOptions): void;
}
export interface CorsOptionsDelegate<TReq = H3ServerRequest> {
  (req: TReq, cb: CorsOptionsCallback): void;
}

export type CorsConfig = CorsOptions | CorsOptionsDelegate;
