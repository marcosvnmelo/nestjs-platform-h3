import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module.ts';

describe('Hello world (default adapter)', () => {
  let server: App;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`host=example.com should execute locally injected pipe by HelloController`, async () => {
    await request(server).get('/hello/local-pipe/1').expect(200).expect({
      id: '1',
    });
  });

  it(`host=host.example.com should execute locally injected pipe by HostController`, async () => {
    await request(server)
      .get('/host/local-pipe/1')
      .set('Host', 'acme.example.com')
      .expect(200)
      .expect({
        id: '1',
        host: true,
        tenant: 'acme',
      });
  });

  it(`should return 404 for mismatched host`, async () => {
    await request(server).get('/host/local-pipe/1').expect(404).expect({
      error: 'Not Found',
      message: 'Cannot GET /host/local-pipe/1',
      statusCode: 404,
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
