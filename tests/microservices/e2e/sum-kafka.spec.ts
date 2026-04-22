import type { StartedKafkaContainer } from '@testcontainers/kafka';
import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import type { BusinessDto } from '../src/kafka/dtos/business.dto.ts';
import type { UserDto } from '../src/kafka/dtos/user.dto.ts';
import { UserEntity } from '../src/kafka/entities/user.entity.ts';
import { KafkaController } from '../src/kafka/kafka.controller.ts';
import { KafkaMessagesController } from '../src/kafka/kafka.messages.controller.ts';
import { kafkaBrokers, startKafkaContainer } from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';
import { ensureKafkaE2eTopics } from './test-infra/ensure-kafka-e2e-topics.ts';

/** Message patterns from KafkaMessagesController + per-pattern reply topics (Nest ClientKafka) + event topic. */
const PATTERNS = [
  'math.sum.sync.kafka.message',
  'math.sum.sync.without.key',
  'math.sum.sync.plain.object',
  'math.sum.sync.array',
  'math.sum.sync.string',
  'math.sum.sync.number',
  'user.create',
  'business.create',
] as const;

describe.sequential('Kafka transport', function () {
  let server: App;
  let app: NestH3Application | undefined;
  let kafkaContainer: StartedKafkaContainer | undefined;

  // set timeout to be longer (especially for the after hook)
  beforeAll(async () => {
    kafkaContainer = await startKafkaContainer();
    const brokers = kafkaBrokers(kafkaContainer);
    await ensureKafkaE2eTopics(PATTERNS, brokers);
    const module = await Test.createTestingModule({
      controllers: [KafkaController, KafkaMessagesController],
      providers: [e2eInfraProvider({ kafkaBrokers: brokers })],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [...brokers],
          retry: { retries: 10, initialRetryTime: 200, maxRetryTime: 5000 },
        },
        producer: { metadataMaxAge: 60_000, allowAutoTopicCreation: true },
      },
    });
    app.enableShutdownHooks();
    await app.startAllMicroservices();
    await app.init();
  });

  it(`/POST (sync sum kafka message)`, async function () {
    await request(server)
      .post('/mathSumSyncKafkaMessage')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum kafka(ish) message without key and only the value)`, async () => {
    await request(server)
      .post('/mathSumSyncWithoutKey')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum plain object)`, async () => {
    await request(server)
      .post('/mathSumSyncPlainObject')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum array)`, async () => {
    await request(server)
      .post('/mathSumSyncArray')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum string)`, async () => {
    await request(server)
      .post('/mathSumSyncString')
      .send([1, 2, 3, 4, 5])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (sync sum number)`, async () => {
    await request(server)
      .post('/mathSumSyncNumber')
      .send([12345])
      .expect(200)
      .expect(200, '15');
  });

  it(`/POST (async event notification)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/notify')
        .send()
        .end(() => {
          setTimeout(() => {
            expect(KafkaController.IS_NOTIFIED).toBe(true);
            done();
          }, 1000);
        });
    }));

  const userDto: UserDto = {
    email: 'enriquebenavidesm@gmail.com',
    name: 'Ben',
    phone: '1112223331',
    years: 33,
  };
  const newUser: UserEntity = new UserEntity(userDto);
  const businessDto: BusinessDto = {
    name: 'Example',
    phone: '2233441122',
    user: newUser,
  };
  it(`/POST (sync command create user)`, async () => {
    await request(server).post('/user').send(userDto).expect(200);
  });

  it(`/POST (sync command create business`, async () => {
    await request(server).post('/business').send(businessDto).expect(200);
  });

  it.skip(`/POST (sync command create user) Concurrency Test`, async () => {
    const promises = [] as Array<Promise<any>>;
    for (let concurrencyKey = 0; concurrencyKey < 50; concurrencyKey++) {
      const innerUserDto = JSON.parse(JSON.stringify(userDto));
      innerUserDto.name += `+${concurrencyKey}`;
      promises.push(request(server).post('/user').send(userDto).expect(200));
    }
    await Promise.all(promises);
  });

  afterAll(async () => {
    await app?.close();
    await kafkaContainer?.stop();
  });
});
