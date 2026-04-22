import type { App } from 'supertest/types.d.ts';
import type { StartedTestContainer } from 'testcontainers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@rstest/core';
import request from 'supertest';

import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { NatsController } from '../src/nats/nats.controller.ts';
import { NatsService } from '../src/nats/nats.service.ts';
import {
  nestNatsServers,
  startNatsContainer,
} from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';

describe('NATS transport', () => {
  let server: App;
  let app: NestH3Application;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startNatsContainer();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NatsController],
      providers: [
        NatsService,
        e2eInfraProvider({ natsServers: nestNatsServers(container) }),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: nestNatsServers(container),
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST`, async () => {
    await request(server)
      .post('/?command=math.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, async () => {
    await request(server)
      .post('/?command=async.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, async () => {
    await request(server)
      .post('/?command=stream.sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (streaming)`, async () => {
    await request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (concurrent)`, async () => {
    await request(server)
      .post('/concurrent')
      .send([
        Array.from({ length: 10 }, (_v, k) => k + 1),
        Array.from({ length: 10 }, (_v, k) => k + 11),
        Array.from({ length: 10 }, (_v, k) => k + 21),
        Array.from({ length: 10 }, (_v, k) => k + 31),
        Array.from({ length: 10 }, (_v, k) => k + 41),
        Array.from({ length: 10 }, (_v, k) => k + 51),
        Array.from({ length: 10 }, (_v, k) => k + 61),
        Array.from({ length: 10 }, (_v, k) => k + 71),
        Array.from({ length: 10 }, (_v, k) => k + 81),
        Array.from({ length: 10 }, (_v, k) => k + 91),
      ])
      .expect(200, 'true');
  });

  it(`/GET (exception)`, async () => {
    await request(server).get('/exception').expect(200, {
      message: 'test',
      status: 'error',
    });
  });

  it(`/POST (event notification)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/notify')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(NatsController.IS_NOTIFIED).toBe(true);
            expect(NatsController.IS_NOTIFIED2).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (sending headers with "RecordBuilder")`, async () => {
    const payload = { items: [1, 2, 3] };
    await request(server)
      .post('/record-builder-duplex')
      .send(payload)
      .expect(200, {
        data: payload,
        headers: {
          ['x-version']: '1.0.0',
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
