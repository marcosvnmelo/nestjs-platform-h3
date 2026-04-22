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

import type { INestApplication, INestMicroservice } from '@nestjs/common';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { RMQFanoutExchangeConsumerController } from '../src/rmq/fanout-exchange-consumer-rmq.controller.ts';
import { RMQFanoutExchangeProducerController } from '../src/rmq/fanout-exchange-producer-rmq.controller.ts';
import { nestRmqUrl, startRabbitContainer } from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';

describe('RabbitMQ transport (Fanout Exchange)', () => {
  let server: any;
  let appProducer: INestApplication;
  let appConsumer: INestMicroservice;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startRabbitContainer();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    const producerModule = await Test.createTestingModule({
      controllers: [RMQFanoutExchangeProducerController],
      providers: [e2eInfraProvider({ rmqUrl: nestRmqUrl(container) })],
    }).compile();
    const consumerModule = await Test.createTestingModule({
      controllers: [RMQFanoutExchangeConsumerController],
    }).compile();

    appProducer = producerModule.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    server = appProducer.getHttpServer();

    appConsumer = consumerModule.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [nestRmqUrl(container)],
        queue: '',
        exchange: 'test.fanout',
        exchangeType: 'fanout',
        queueOptions: {
          exclusive: true,
        },
      },
    });
    await Promise.all([appProducer.init(), appConsumer.listen()]);
  });

  it(`should send message to fanout exchange`, async () => {
    await request(server).get('/fanout-exchange').expect(200, 'ping/pong');
  });

  afterEach(async () => {
    await Promise.all([appProducer.close(), appConsumer.close()]);
  });
});
