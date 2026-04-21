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

  [
    {
      host: 'example.com',
      path: '/hello',
      greeting: 'Hello world!',
    },
    {
      host: 'acme.example.com',
      path: '/host',
      greeting: 'Host Greeting! tenant=acme',
    },
    {
      host: 'acme.example1.com',
      path: '/host-array',
      greeting: 'Host Greeting! tenant=acme',
    },
    {
      host: 'acme.example2.com',
      path: '/host-array',
      greeting: 'Host Greeting! tenant=acme',
    },
  ].forEach(({ host, path, greeting }) => {
    describe(`host=${host}`, () => {
      describe('/GET', () => {
        it(`should return "${greeting}"`, async () => {
          await request(server)
            .get(path)
            .set('Host', host)
            .expect(200)
            .expect(greeting);
        });

        it(`should attach response header`, async () => {
          await request(server)
            .get(path)
            .set('Host', host)
            .expect(200)
            .expect('Authorization', 'Bearer');
        });
      });

      it(`/GET (Promise/async) returns "${greeting}"`, async () => {
        await request(server)
          .get(`${path}/async`)
          .set('Host', host)
          .expect(200)
          .expect(greeting);
      });

      it(`/GET (Observable stream) "${greeting}"`, async () => {
        await request(server)
          .get(`${path}/stream`)
          .set('Host', host)
          .expect(200)
          .expect(greeting);
      });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
