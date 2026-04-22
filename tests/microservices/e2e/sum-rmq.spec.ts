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

import { RMQController } from '../src/rmq/rmq.controller.ts';
import { nestRmqUrl, startRabbitContainer } from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';

describe('RabbitMQ transport', () => {
  let server: App;
  let app: NestH3Application;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startRabbitContainer();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RMQController],
      providers: [e2eInfraProvider({ rmqUrl: nestRmqUrl(container) })],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [nestRmqUrl(container)],
        queue: 'test',
        queueOptions: { durable: false },
        socketOptions: { noDelay: true },
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (Promise/async)`, async () => {
    await request(server)
      .post('/?command=asyncSum')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (Observable stream)`, async () => {
    await request(server)
      .post('/?command=streamSum')
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

  it(`/POST (streaming)`, async () => {
    await request(server)
      .post('/stream')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (multiple-urls)`, async () => {
    await request(server)
      .post('/multiple-urls')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (event notification)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/notify')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(RMQController.IS_NOTIFIED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (sending options with "RecordBuilder")`, async () => {
    const payload = { items: [1, 2, 3] };
    await request(server)
      .post('/record-builder-duplex')
      .send(payload)
      .expect(200, {
        data: payload,
        headers: {
          ['x-version']: '1.0.0',
        },
        priority: 3,
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
