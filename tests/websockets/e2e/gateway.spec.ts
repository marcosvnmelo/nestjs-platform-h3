import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { EventSource } from 'eventsource';
import { io } from 'socket.io-client';

import type { INestApplication, Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { AppController as LongConnectionController } from '@marcosvnmelo/nest-application-sse-tests';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { getHttpServerPort } from '@marcosvnmelo/testing-shared';

import { ApplicationGateway } from '../src/app.gateway.js';
import { NamespaceGateway } from '../src/namespace.gateway.js';
import { ServerGateway } from '../src/server.gateway.js';

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

describe('WebSocketGateway', () => {
  let ws: ReturnType<typeof io>, app: INestApplication;

  it(`should handle message (2nd port)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>((resolve) =>
      ws.on('pop', (data) => {
        expect(data.test).toEqual('test');
        resolve();
      }),
    );
  });

  it(`should handle message (http)`, async () => {
    app = await createNestApp(ServerGateway);
    await app.listen(0);

    ws = io(`http://localhost:${getHttpServerPort(app)}`);
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>((resolve) =>
      ws.on('pop', (data) => {
        expect(data.test).toEqual('test');
        resolve();
      }),
    );
  });

  it(`should handle message (2 gateways)`, async () => {
    app = await createNestApp(ApplicationGateway, NamespaceGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    io('http://localhost:8080/test').emit('push', {});
    ws.emit('push', {
      test: 'test',
    });
    await new Promise<void>((resolve) =>
      ws.on('pop', (data) => {
        expect(data.test).toEqual('test');
        resolve();
      }),
    );
  });

  it(`should be able to get the pattern in an interceptor`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    ws.emit('getClient', {
      test: 'test',
    });
    await new Promise<void>((resolve) =>
      ws.on('popClient', (data) => {
        expect(data.path).toEqual('getClient');
        resolve();
      }),
    );
  });

  it(`should be able to get the pattern in a filter (when the error comes from a known handler)`, async () => {
    app = await createNestApp(ApplicationGateway);
    await app.listen(0);

    ws = io('http://localhost:8080');
    ws.emit('getClientWithError', {
      test: 'test',
    });
    await new Promise<void>((resolve) =>
      ws.on('exception', (data) => {
        expect(data.pattern).toEqual('getClientWithError');
        resolve();
      }),
    );
  });

  describe('shared server for WS and Long-Running connections', () => {
    it('should block application shutdown', () =>
      new Promise<void>((done) => {
        let eventSource: EventSource;

        void (async () => {
          setTimeout(() => {
            expect(shutdownSpy).not.toHaveBeenCalled();
            eventSource.close();
            ws.disconnect();
            done();
          }, 25000);

          const testingModule = await Test.createTestingModule({
            providers: [ServerGateway],
            controllers: [LongConnectionController],
          }).compile();
          const shutdownSpy = rs.spyOn(
            testingModule.get(ServerGateway),
            'onApplicationShutdown',
          );
          app = testingModule.createNestApplication<NestH3Application>(
            new H3Adapter(),
          );

          await app.listen(0);
          const p = getHttpServerPort(app);
          ws = io(`http://localhost:${p}`);
          eventSource = new EventSource(`http://localhost:${p}/sse`);

          await new Promise<void>((resolve, reject) => {
            ws.on('connect', resolve);
            ws.on('error', reject);
          });

          await new Promise((resolve, reject) => {
            eventSource.onmessage = resolve;
            eventSource.onerror = reject;
          });

          await app.close();
        })();
      }));

    it('should shutdown application immediately when forceCloseConnections is true', async () => {
      const testingModule = await Test.createTestingModule({
        providers: [ServerGateway],
        controllers: [LongConnectionController],
      }).compile();

      const shutdownSpy = rs.spyOn(
        testingModule.get(ServerGateway),
        'onApplicationShutdown',
      );

      app = testingModule.createNestApplication<NestH3Application>(
        new H3Adapter(),
        {
          forceCloseConnections: true,
        },
      );

      await app.listen(0);
      const p = getHttpServerPort(app);
      ws = io(`http://localhost:${p}`);
      const eventSource = new EventSource(`http://localhost:${p}/sse`);

      await new Promise<void>((resolve, reject) => {
        ws.on('connect', resolve);
        ws.on('error', reject);
      });

      await new Promise((resolve, reject) => {
        eventSource.onmessage = resolve;
        eventSource.onerror = reject;
      });

      await app.close();

      expect(shutdownSpy).toHaveBeenCalled();
      eventSource.close();
    });
  });

  afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore double-close / already closing
      }
    }
  });
});
