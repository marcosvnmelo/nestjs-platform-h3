import * as net from 'node:net';
import { fetchNodeHandler } from 'srvx/node';

import type { INestApplication } from '@nestjs/common';

import type {
  H3ServerRequest,
  H3ServerResponse,
  NestH3Application,
} from '@marcosvnmelo/nestjs-platform-h3';

/** Port the HTTP server is bound to after `listen(0)` or a concrete port. */
export function getHttpServerPort(
  app: INestApplication | NestH3Application,
): number {
  const address = app.getHttpServer().address();
  if (address && typeof address === 'object' && 'port' in address) {
    return (address as net.AddressInfo).port;
  }
  throw new Error('Expected a listening TCP server with a numeric address');
}

/**
 * Picks a free TCP port, then releases it. For tests that need a known
 * port number before calling `app.listen` (e.g. EADDRINUSE coverage).
 */
export function allocEphemeralTcpPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close((err) => (err != null ? reject(err) : resolve(port)));
    });
  });
}

export function fetchAppHandler(app: NestH3Application, request: Request) {
  return fetchNodeHandler(
    (req: H3ServerRequest, res: H3ServerResponse) =>
      void app.getHttpServer().emit('request', req, res),
    request,
  );
}
