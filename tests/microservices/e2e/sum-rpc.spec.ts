import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppController } from '../src/app.controller.ts';
import { AppModule } from '../src/app.module.ts';

describe('RPC transport', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
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

  it(`/POST (useFactory client)`, async () => {
    await request(server)
      .post('/useFactory?command=sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, '15');
  });

  it(`/POST (useClass client)`, async () => {
    await request(server)
      .post('/useClass?command=sum')
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

  it(`/POST (pattern not found)`, async () => {
    await request(server).post('/?command=test').expect(500);
  });

  it(`/POST (event notification)`, () =>
    new Promise<void>((done) => {
      void request(server)
        .post('/notify')
        .send([1, 2, 3, 4, 5])
        .end(() => {
          setTimeout(() => {
            expect(AppController.IS_NOTIFIED).toBe(true);
            done();
          }, 1000);
        });
    }));

  it('/POST (custom client)', async () => {
    await request(server)
      .post('/error?client=custom')
      .send({})
      .expect(200)
      .expect('true');
  });

  it('/POST (standard client)', async () => {
    await request(server)
      .post('/error?client=standard')
      .send({})
      .expect(200)
      .expect('false');
  });

  afterEach(async () => {
    await app.close();
  });
});
