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
}

describe('Application Lifecycle (H3 adapter)', () => {
  describe('async init()', () => {
    let app: NestH3Application;

    it('should properly initialize the application', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());

      // Init should be awaitable
      await app.init();

      // Application should work after init
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
  });

  describe('graceful shutdown via close()', () => {
    it('should close the application gracefully', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = module.createNestApplication<NestH3Application>(
        new H3Adapter(),
      );
      await app.init();

      // Verify app is running
      await request(app.getHttpServer()).get('/test').expect(200);

      // Close should complete without error
      await app.close();

      // HTTP server should be closed
      const httpServer = app.getHttpServer();
      expect(httpServer.listening).toBe(false);
    });
  });

  describe('listen()', () => {
    let app: NestH3Application;

    it('should start listening on specified port', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      // Listen on a dynamic port
      await new Promise<void>((resolve) => {
        void app.listen(0, () => resolve());
      });

      const httpServer = app.getHttpServer();
      expect(httpServer.listening).toBe(true);
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
  });

  describe('@nestjs/testing compatibility', () => {
    it('should work with Test.createTestingModule', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      expect(module).not.toBeUndefined();
      expect(module.createNestApplication).toBeInstanceOf(Function);
    });

    it('should create NestH3Application with H3Adapter', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = module.createNestApplication<NestH3Application>(
        new H3Adapter(),
      );

      expect(app).not.toBeUndefined();
      expect(app.getHttpAdapter()).not.toBeUndefined();
      expect(app.getHttpAdapter().getType()).toBe('h3');

      await app.close();
    });

    it('should retrieve HTTP server from app', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      const app = module.createNestApplication<NestH3Application>(
        new H3Adapter(),
      );
      await app.init();

      const server = app.getHttpServer();
      expect(server).not.toBeUndefined();

      await app.close();
    });
  });
});
