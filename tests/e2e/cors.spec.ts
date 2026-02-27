import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'success';
  }
}

describe('CORS (H3 adapter)', () => {
  let app: NestH3Application;

  describe('with default options', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should handle simple CORS request', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'http://example.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', '*');
    });

    it('should handle preflight OPTIONS request', async () => {
      await request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
        .expect('Access-Control-Allow-Origin', '*')
        .expect('Access-Control-Allow-Methods', /GET|\*/); // H3 returns '*' for all methods
    });
  });

  describe('with custom origin', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: ['https://allowed-origin.com'],
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should set correct origin header', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'https://allowed-origin.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'https://allowed-origin.com');
    });
  });

  describe('with credentials', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        credentials: true,
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include credentials header', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'http://example.com')
        .expect(200)
        .expect('Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('with custom methods and headers', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include custom methods in preflight', async () => {
      await request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204)
        .expect((res) => {
          const methods = res.headers['access-control-allow-methods'];
          expect(methods).toContain('GET');
          expect(methods).toContain('POST');
          expect(methods).toContain('PUT');
        });
    });

    it('should include custom allowed headers', async () => {
      await request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204)
        .expect((res) => {
          const headers = res.headers['access-control-allow-headers'];
          expect(headers.toLowerCase()).toContain('authorization');
        });
    });
  });

  describe('with origin function callback', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: (origin: string | undefined) => {
          // Allow only specific origins dynamically
          const allowedOrigins = ['https://allowed.com', 'https://trusted.com'];
          return origin && allowedOrigins.includes(origin) ? origin : false;
        },
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should allow origin from callback returning allowed origin', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'https://allowed.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'https://allowed.com');
    });

    it('should allow another origin from callback', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'https://trusted.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'https://trusted.com');
    });
  });

  describe('with maxAge option', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        maxAge: 3600,
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include max-age in preflight response', async () => {
      await request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
        .expect('Access-Control-Max-Age', '3600');
    });
  });

  describe('with exposed headers', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        exposedHeaders: ['X-Custom-Header', 'X-Request-Id'],
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include exposed headers in response', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'http://example.com')
        .expect(200)
        .expect((res) => {
          const exposedHeaders = res.headers['access-control-expose-headers'];
          expect(exposedHeaders).toContain('X-Custom-Header');
          expect(exposedHeaders).toContain('X-Request-Id');
        });
    });
  });
});
