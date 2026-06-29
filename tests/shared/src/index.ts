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

interface InjectRequestOptions extends Partial<
  Pick<Request, 'method' | 'headers' | 'body'>
> {
  baseUrl?: string;
  url: string;
  query?: Record<string, string>;
}

interface FastifyLikeResponse {
  statusCode: number;
  payload: string;
  raw: Response;
}

export function wrapH3App(app: NestH3Application) {
  return {
    inject: async (requestOptions: InjectRequestOptions) =>
      injectRequestInto(app, requestOptions),
  };
}

async function injectRequestInto(
  app: NestH3Application,
  requestOptions: InjectRequestOptions,
): Promise<FastifyLikeResponse> {
  const url = buildUrl(requestOptions);

  const response = await fetchAppHandler(
    app,
    new Request(url, {
      method: requestOptions.method,
      headers: requestOptions.headers,
      body: requestOptions.body,
    }),
  );

  return buildFastifyLikeResponse(response);
}

function buildUrl(requestOptions: InjectRequestOptions): string {
  const baseUrl = requestOptions.baseUrl ?? 'http://localhost:3000';

  const url = new URL(baseUrl);

  url.pathname = requestOptions.url;

  if (requestOptions.query) {
    const queryString = new URLSearchParams(requestOptions.query).toString();
    url.search = queryString;
  }

  return url.toString();
}

async function buildFastifyLikeResponse(
  response: Response,
): Promise<FastifyLikeResponse> {
  return {
    statusCode: response.status,
    payload: await response.text(),
    raw: response,
  };
}

export { verify_containers } from './docker.ts';
