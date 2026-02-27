import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import {
  HeaderInterceptor,
  LoggingInterceptor,
  OVERRIDE_VALUE,
  OverrideInterceptor,
  TransformInterceptor,
} from '../src/interceptors/interceptors';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'Hello world!';
  }

  @Get('async')
  async asyncTest() {
    return 'Async hello!';
  }

  @Get('object')
  objectTest() {
    return { message: 'Hello' };
  }
}

describe('Interceptors (H3 adapter)', () => {
  let app: NestH3Application;

  describe('OverrideInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new OverrideInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should override response (sync)', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect(OVERRIDE_VALUE);
    });

    it('should override response (async)', async () => {
      await request(app.getHttpServer())
        .get('/test/async')
        .expect(200)
        .expect(OVERRIDE_VALUE);
    });
  });

  describe('TransformInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new TransformInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should wrap response in data object (string)', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect({ data: 'Hello world!' });
    });

    it('should wrap response in data object (async)', async () => {
      await request(app.getHttpServer())
        .get('/test/async')
        .expect(200)
        .expect({ data: 'Async hello!' });
    });

    it('should wrap response in data object (object)', async () => {
      await request(app.getHttpServer())
        .get('/test/object')
        .expect(200)
        .expect({ data: { message: 'Hello' } });
    });
  });

  describe('HeaderInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new HeaderInterceptor({
              'X-Custom-Header': 'custom-value',
              'X-Another-Header': 'another-value',
            }),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should add custom headers to response', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('X-Custom-Header', 'custom-value')
        .expect('X-Another-Header', 'another-value');
    });
  });

  describe('LoggingInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new LoggingInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should add request info to response', async () => {
      await request(app.getHttpServer())
        .get('/test/object')
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Hello');
          expect(res.body.requestInfo).not.toBeUndefined();
          expect(res.body.requestInfo.method).toBe('GET');
          expect(typeof res.body.requestInfo.executionTime).toBe('number');
        });
    });
  });
});
