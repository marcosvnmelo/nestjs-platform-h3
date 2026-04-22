import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { DisconnectedClientController } from '../src/disconnected.controller.ts';

describe('Disconnected client', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DisconnectedClientController],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    await app.init();
  });

  it(`TCP`, async () => {
    await request(server)
      .post('/')
      .send({
        transport: Transport.TCP,
      })
      .expect(408);
  });

  it(`REDIS`, async () => {
    await request(server)
      .post('/')
      .send({
        transport: Transport.REDIS,
        options: {
          port: '3333',
        },
      })
      .expect(408);
  });

  it(`NATS`, async () => {
    await request(server)
      .post('/')
      .send({
        transport: Transport.NATS,
        options: {
          servers: 'nats://localhost:4224',
        },
      })
      .expect(408);
  });

  it(`MQTT`, async () => {
    await request(server)
      .post('/')
      .send({
        transport: Transport.MQTT,
        options: {
          host: 'mqtt://broker.hivemq.com',
          port: 183,
        },
      })
      .expect(408);
  });

  it(`RMQ`, async () => {
    await request(server)
      .post('/')
      .send({
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://0.0.0.0:3333`],
          queue: 'test',
        },
      })
      .expect(408);
  });

  afterEach(async () => {
    await app.close();
  });
});
