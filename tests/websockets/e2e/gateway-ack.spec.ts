import { afterEach, describe, expect, it } from '@rstest/core';
import { io } from 'socket.io-client';

import type { INestApplication, Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AckGateway } from '../src/ack.gateway.js';

async function createNestApp(
  ...gateways: Provider[]
): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  const app = testingModule.createNestApplication<NestH3Application>(
    new H3Adapter(),
  );
  return app;
}

describe('WebSocketGateway (ack)', () => {
  let ws: ReturnType<typeof io>, app: INestApplication;

  it(`should handle message with ack (http)`, async () => {
    app = await createNestApp(AckGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    await new Promise<void>((resolve) =>
      ws.emit('push', { test: 'test' }, (data: unknown) => {
        expect(data).toEqual('pong');
        resolve();
      }),
    );
  });

  it(`should handle message with ack & without data (http)`, async () => {
    app = await createNestApp(AckGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    await new Promise<void>((resolve) =>
      ws.emit('push', (data: unknown) => {
        expect(data).toEqual('pong');
        resolve();
      }),
    );
  });

  it('should handle manual ack for async operations when @Ack() is used (success case)', async () => {
    app = await createNestApp(AckGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    const payload = { shouldSucceed: true };

    await new Promise<void>((resolve) =>
      ws.emit('manual-ack', payload, (response: unknown) => {
        expect(response).toEqual({ status: 'success', data: payload });
        resolve();
      }),
    );
  });

  it('should handle manual ack for async operations when @Ack() is used (error case)', async () => {
    app = await createNestApp(AckGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    const payload = { shouldSucceed: false };

    await new Promise<void>((resolve) =>
      ws.emit('manual-ack', payload, (response: unknown) => {
        expect(response).toEqual({
          status: 'error',
          message: 'Operation failed',
        });
        resolve();
      }),
    );
  });

  afterEach(() => app.close());
});
