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

import { MqttBroadcastController } from '../src/mqtt/mqtt-broadcast.controller.ts';
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
    const mqttUrl = nestMqttUrl(container);
    const module = await Test.createTestingModule({
      controllers: [MqttBroadcastController],
      providers: [e2eInfraProvider({ mqttUrl })],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    const connect = { url: mqttUrl };
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: connect,
    });
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: connect,
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`Broadcast (2 subscribers)`, async () => {
    await request(server).get('/broadcast').expect(200, '2');
  });

  afterEach(async () => {
    await app.close();
  });
});
