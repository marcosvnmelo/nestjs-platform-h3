import { afterAll, beforeAll, describe, it } from '@rstest/core';
import request from 'supertest';

import { VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('URI Versioning (fastify)', () => {
  let app: NestH3Application;

  // ======================================================================== //
  describe('without global default version', () => {
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.URI,
      });
      await app.init();
    });

    describe('GET /', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2')
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/param/hello')
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/param/hello')
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/param/hello').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/param/hello').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/multiple').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/multiple').expect(404);
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

    describe('GET /override', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/override')
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/override')
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/override').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/override-partial')
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/override-partial')
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer())
          .get('/v3/override-partial')
          .expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/override-partial').expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', async () => {
        await request(app.getHttpServer()).get('/v1/foo/bar').expect(404);
      });

      it('V2', async () => {
        await request(app.getHttpServer()).get('/v2/foo/bar').expect(404);
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/foo/bar').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer())
          .get('/foo/bar')
          .expect(200)
          .expect('Hello FooBar!');
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('with the global default version: "1"', () => {
    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });
      await app.init();
    });

    describe('GET /', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2')
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/param/hello')
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/param/hello')
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/param/hello').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/param/hello').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/multiple').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/multiple').expect(404);
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

    describe('GET /override', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/override')
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/override')
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/override').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/override-partial')
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', async () => {
        await request(app.getHttpServer())
          .get('/v2/override-partial')
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', async () => {
        await request(app.getHttpServer())
          .get('/v3/override-partial')
          .expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/override-partial').expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', async () => {
        await request(app.getHttpServer())
          .get('/v1/foo/bar')
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', async () => {
        await request(app.getHttpServer()).get('/v2/foo/bar').expect(404);
      });

      it('V3', async () => {
        await request(app.getHttpServer()).get('/v3/foo/bar').expect(404);
      });

      it('No Version', async () => {
        await request(app.getHttpServer()).get('/foo/bar').expect(404);
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });
});
