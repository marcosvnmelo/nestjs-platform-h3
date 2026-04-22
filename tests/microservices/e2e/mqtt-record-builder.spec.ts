import type { App } from 'supertest/types.d.ts';
import type { StartedTestContainer } from 'testcontainers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
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
        subscribeOptions: {
          qos: 1,
        },
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST (setting packet options with "RecordBuilder")`, async () => {
    const payload = { items: [1, 2, 3] };
    await request(server)
      .post('/record-builder-duplex')
      .send(payload)
      .expect(200, {
        data: payload,
        qos: 1,
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
