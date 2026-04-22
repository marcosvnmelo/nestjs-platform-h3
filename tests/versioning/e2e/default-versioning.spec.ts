import { afterAll, beforeAll, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

/**
 * `.enableVersioning()` uses `VersioningType.URI` type by default
 * Regression test for #13496
 * @see [Versioning](https://docs.nestjs.com/techniques/versioning)
 */
describe('Default Versioning behavior', () => {
  // ======================================================================== //
  describe('Express', () => {
    let app: NestH3Application;
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning();
      await app.init();
    });

    describe('GET /', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('No Version', async () => {
        await request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('Fastify', () => {
    let app: NestH3Application;
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning();
      await app.init();
    });

    describe('GET /', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('No Version', async () => {
        await request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });
});
