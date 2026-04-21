import { fetchNodeHandler } from 'srvx/node';

import type {
  H3ServerRequest,
  H3ServerResponse,
  NestH3Application,
} from '@marcosvnmelo/nestjs-platform-h3';

export function fetchAppHandler(app: NestH3Application, request: Request) {
  return fetchNodeHandler(
    (req: H3ServerRequest, res: H3ServerResponse) =>
      void app.getHttpServer().emit('request', req, res),
    request,
  );
}
