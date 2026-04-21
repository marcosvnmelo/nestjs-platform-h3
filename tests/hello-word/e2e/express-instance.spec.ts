import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import { H3 } from 'h3';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('Hello world (express instance)', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(
      new H3Adapter(new H3()),
    );
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

  it('/HEAD should respond to with a 200', async () => {
    await request(server).head('/hello').expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
