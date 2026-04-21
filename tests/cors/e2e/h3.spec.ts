import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type {
  CorsOptions,
  CorsOptionsDelegate,
  H3ServerRequest,
  NestH3Application,
} from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('H3 Cors', () => {
  let app: NestH3Application;
  let server: App;
  const configs: CorsOptions[] = [
    {
      origin: ['example.com'],
      methods: ['GET'],
      credentials: true,
      exposeHeaders: ['foo', 'bar'],
      allowHeaders: ['baz', 'woo'],
      maxAge: '123',
    },
    {
      origin: ['sample.com'],
      methods: ['GET'],
      credentials: true,
      exposeHeaders: ['zoo', 'bar'],
      allowHeaders: ['baz', 'foo'],
      maxAge: '321',
    },
  ];
  describe('Dynamic config', () => {
    describe('enableCors', () => {
      let requestId: number;

      beforeAll(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestH3Application>(new H3Adapter());
        server = app.getHttpServer();

        const configDelegation: CorsOptionsDelegate<H3ServerRequest> =
          function (_req, cb) {
            const config = configs[requestId!];
            cb(null, config);
          };
        app.enableCors(configDelegation);

        await app.init();
      });

      it(`should add cors headers based on the first config`, async () => {
        requestId = 0;
        await request(server)
          .get('/')
          .set('origin', 'example.com')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      it(`should add cors headers based on the second config`, async () => {
        requestId = 1;
        await request(server)
          .options('/')
          .set('access-control-request-method', 'GET')
          .set('origin', 'sample.com')
          .expect(204)
          .expect('access-control-allow-origin', 'sample.com')
          .expect('vary', 'access-control-request-headers')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-allow-methods', 'GET')
          .expect('access-control-allow-headers', 'baz,foo')
          .expect('access-control-max-age', '321');
      });

      afterAll(async () => {
        await app.close();
      });
    });

    describe('Application Options', () => {
      let requestId;

      beforeAll(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        const configDelegation: CorsOptionsDelegate<H3ServerRequest> =
          function (_req, cb) {
            const config = configs[requestId!];
            cb(null, config);
          };

        app = module.createNestApplication<NestH3Application>(new H3Adapter(), {
          cors: configDelegation as any,
        });
        server = app.getHttpServer();

        await app.init();
      });

      it(`should add cors headers based on the first config`, async () => {
        requestId = 0;
        await request(server)
          .get('/')
          .set('origin', 'example.com')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      it(`should add cors headers based on the second config`, async () => {
        requestId = 1;
        await request(server)
          .options('/')
          .set('origin', 'sample.com')
          .expect('access-control-allow-origin', 'sample.com')
          .expect('vary', 'origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'zoo,bar');
      });

      afterAll(async () => {
        await app.close();
      });
    });
  });
  describe('Static config', () => {
    describe('enableCors', () => {
      beforeAll(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestH3Application>(new H3Adapter());
        server = app.getHttpServer();
        app.enableCors(configs[0]);

        await app.init();
      });

      it(`CORS headers`, async () => {
        await request(server)
          .get('/')
          .set('origin', 'example.com')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      afterAll(async () => {
        await app.close();
      });
    });

    describe('Application Options', () => {
      beforeAll(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestH3Application>(new H3Adapter(), {
          cors: configs[0] as any,
        });
        server = app.getHttpServer();
        await app.init();
      });

      it(`CORS headers`, async () => {
        await request(server)
          .get('/')
          .set('origin', 'example.com')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      afterAll(async () => {
        await app.close();
      });
    });
  });
});
