import { afterEach, describe, expect, it } from '@rstest/core';
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

  @Get('/slow')
  async slow() {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return 'slow-success';
  }
}

describe('Lifecycle Hooks (H3 adapter)', () => {
  let app: NestH3Application;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('setOnRequestHook()', () => {
    it('should call onRequest hook before handling request', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      const adapter = app.getHttpAdapter();

      // Access the adapter directly to set the hook
      adapter.setOnRequestHook((req, _res, done) => {
        hookCalls.push('onRequest:' + req.url);
        done();
      });

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      expect(hookCalls).toContain('onRequest:/test');
    });

    it('should support async onRequest hooks', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnRequestHook(
        async (req, _res, done) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          hookCalls.push('async-onRequest:' + req.url);
          done();
        },
      );

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      expect(hookCalls).toContain('async-onRequest:/test');
    });

    it('should call onRequest hook before controller code runs', async () => {
      const executionOrder: string[] = [];

      // Create a controller that tracks execution
      @Controller('order')
      class OrderController {
        @Get()
        test() {
          executionOrder.push('controller');
          return 'done';
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [OrderController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      const adapter = app.getHttpAdapter();

      adapter.setOnRequestHook((_req, _res, done) => {
        executionOrder.push('hook');
        done();
      });

      await app.init();

      await request(app.getHttpServer()).get('/order').expect(200);

      expect(executionOrder[0]).toBe('hook');
      expect(executionOrder[1]).toBe('controller');
    });
  });

  describe('setOnResponseHook()', () => {
    it('should call onResponse hook after response is finished', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnResponseHook((req, res) => {
        hookCalls.push('onResponse:' + req.url + ':' + res.statusCode);
      });

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      // Give a small delay for the finish event to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(hookCalls).toContain('onResponse:/test:200');
    });

    it('should call onResponse hook with correct status code for errors', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnResponseHook((req, res) => {
        hookCalls.push('onResponse:' + req.url + ':' + res.statusCode);
      });

      await app.init();

      await request(app.getHttpServer()).get('/nonexistent').expect(404);

      // Give a small delay for the finish event to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(hookCalls.some((call) => call.includes(':404'))).toBe(true);
    });
  });

  describe('combined hooks', () => {
    it('should support both onRequest and onResponse hooks together', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      const adapter = app.getHttpAdapter();

      adapter.setOnRequestHook((_req, _res, done) => {
        hookCalls.push('request:start');
        done();
      });

      adapter.setOnResponseHook((_req, _res) => {
        hookCalls.push('response:end');
      });

      await app.init();

      await request(app.getHttpServer()).get('/test').expect(200);

      // Give a small delay for the finish event to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(hookCalls).toContain('request:start');
      expect(hookCalls).toContain('response:end');
      expect(hookCalls.indexOf('request:start')).toBeLessThan(
        hookCalls.indexOf('response:end'),
      );
    });
  });
});
