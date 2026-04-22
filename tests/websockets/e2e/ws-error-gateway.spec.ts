import { afterEach, describe, expect, it } from '@rstest/core';
import WebSocket from 'ws';

import type { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { WsErrorGateway } from '../src/ws-error.gateway.js';

async function createNestApp(...gateways: any[]): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication<NestH3Application>(
    new H3Adapter(),
  );
  app.useWebSocketAdapter(new WsAdapter(app) as any);
  return app;
}

describe('WebSocketGateway (WsAdapter) - Error Handling', () => {
  let ws: WebSocket, app: INestApplication;

  it('should send WsException error to client via native WebSocket', async () => {
    app = await createNestApp(WsErrorGateway);
    await app.listen(0);

    ws = new WebSocket('ws://localhost:8085');
    await new Promise((resolve) => ws.on('open', resolve));

    ws.send(
      JSON.stringify({
        event: 'push',
        data: {
          test: 'test',
        },
      }),
    );

    await new Promise<void>((resolve) =>
      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response).toEqual({
          event: 'exception',
          data: {
            status: 'error',
            message: 'test',
            cause: {
              pattern: 'push',
              data: {
                test: 'test',
              },
            },
          },
        });
        ws.close();
        resolve();
      }),
    );
  });

  afterEach(async function () {
    await app.close();
  });
});
