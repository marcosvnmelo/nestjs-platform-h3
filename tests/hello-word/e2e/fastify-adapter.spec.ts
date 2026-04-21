import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('Hello world (fastify adapter)', () => {
  let app: NestH3Application;
  let server: App;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  it(`/GET`, async () => {
    await request(server).get('/hello').expect(200).expect('Hello world!');
  });

  it(`/GET (Promise/async)`, async () => {
    await request(server)
      .get('/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (Observable stream)`, async () => {
    await request(server)
      .get('/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET { host: ":tenant.example.com" } not matched`, async () => {
    await request(server).get('/host').expect(404).expect({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /host',
    });
  });

  it(`/GET { host: [":tenant.example1.com", ":tenant.example2.com"] } matched`, async () => {
    await request(server)
      .get('/host-array')
      .set('Host', 'tenant.example1.com')
      .expect(200)
      .expect('Host Greeting! tenant=tenant');

    await request(server)
      .get('/host-array')
      .set('Host', 'tenant.example2.com')
      .expect(200)
      .expect('Host Greeting! tenant=tenant');
  });

  it('/HEAD should respond to with a 200', async () => {
    await request(server).head('/hello').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
