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

import { RMQTopicExchangeController } from '../src/rmq/topic-exchange-rmq.controller.ts';
import { nestRmqUrl, startRabbitContainer } from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';

describe('RabbitMQ transport (Topic Exchange - wildcards)', () => {
  let server: any;
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
      controllers: [RMQTopicExchangeController],
      providers: [e2eInfraProvider({ rmqUrl: nestRmqUrl(container) })],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [nestRmqUrl(container)],
        queue: 'test2',
        wildcards: true,
      },
    });
    await app.startAllMicroservices();
    await app.init();
  });

  it(`should send message to wildcard topic exchange`, async () => {
    await request(server).get('/topic-exchange').expect(200, 'wildcard.a.b');
  });

  afterEach(async () => {
    await app.close();
  });
});
