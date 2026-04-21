import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import { H3 } from 'h3';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('Hello world (express instance with multiple applications)', () => {
  let server: App;
  let apps: NestH3Application[];

  beforeEach(async () => {
    const module1 = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const module2 = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new H3Adapter(new H3());

    apps = [
      module1.createNestApplication<NestH3Application>(adapter),
      module2
        .createNestApplication<NestH3Application>(adapter)
        .setGlobalPrefix('/app2'),
    ];
    await Promise.all(apps.map((app) => app.init()));

    server = adapter.getHttpServer();
  });

  it(`/GET`, async () => {
    await request(server).get('/hello').expect(200).expect('Hello world!');
  });

  it(`/GET (app2)`, async () => {
    await request(server).get('/app2/hello').expect(200).expect('Hello world!');
  });

  it(`/GET (Promise/async)`, async () => {
    await request(server)
      .get('/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Promise/async)`, async () => {
    await request(server)
      .get('/app2/hello/async')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (Observable stream)`, async () => {
    await request(server)
      .get('/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  it(`/GET (app2 Observable stream)`, async () => {
    await request(server)
      .get('/app2/hello/stream')
      .expect(200)
      .expect('Hello world!');
  });

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });
});
