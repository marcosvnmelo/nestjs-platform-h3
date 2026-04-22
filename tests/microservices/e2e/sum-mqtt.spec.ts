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

import { MqttController } from '../src/mqtt/mqtt.controller.ts';
import {
  nestMqttUrl,
  startMosquittoContainer,
} from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';

describe('MQTT transport', () => {
  let server: App;
  let app: NestH3Application;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startMosquittoContainer();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MqttController],
      providers: [e2eInfraProvider({ mqttUrl: nestMqttUrl(container) })],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: nestMqttUrl(container),
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

  it(`/POST (concurrent)`, async function () {
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

  it(`/POST (event notification)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/notify')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_NOTIFIED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard EVENT #)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/wildcard-event')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_WILDCARD_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard MESSAGE #)`, async () => {
    await request(server)
      .post('/wildcard-message')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (wildcard EVENT +)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/wildcard-event2')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_WILDCARD2_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (wildcard MESSAGE +)`, async () => {
    await request(server)
      .post('/wildcard-message2')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (shared wildcard EVENT #)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/shared-wildcard-event')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_SHARED_WILDCARD_EVENT_RECEIVED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it(`/POST (shared wildcard MESSAGE #)`, async () => {
    await request(server)
      .post('/shared-wildcard-message')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  it(`/POST (shared wildcard EVENT +)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/shared-wildcard-event2')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(MqttController.IS_SHARED_WILDCARD2_EVENT_RECEIVED).toBe(
              true,
            );
            done();
          }, 1000);
        });
    }));

  it(`/POST (shared wildcard MESSAGE +)`, async () => {
    await request(server)
      .post('/shared-wildcard-message2')
      .send([1, 2, 3, 4, 5])
      .expect(201, '15');
  });

  afterEach(async () => {
    await app.close();
  });
});
