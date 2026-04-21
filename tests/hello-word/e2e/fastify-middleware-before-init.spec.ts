import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  H3Adapter,
  H3ServerRequest,
  H3ServerResponse,
  NestH3Application,
  PolyfilledResponse,
} from '@marcosvnmelo/nestjs-platform-h3';
import { fetchAppHandler } from '@marcosvnmelo/testing-shared';

describe('Middleware before init (H3Adapter)', () => {
  let app: NestH3Application;

  @Injectable()
  class TestService {
    getData(): string {
      return 'test_data';
    }
  }

  @Controller()
  class TestController {
    constructor(private readonly testService: TestService) {}

    @Get('test')
    test() {
      return { data: this.testService.getData() };
    }

    @Get('health')
    health() {
      return { status: 'ok' };
    }
  }

  @Module({
    controllers: [TestController],
    providers: [TestService],
  })
  class TestModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
      consumer
        .apply(
          (
            _req: H3ServerRequest,
            res: PolyfilledResponse<H3ServerResponse>,
            next: () => void,
          ) => {
            res.setHeader('x-middleware', 'applied');
            next();
          },
        )
        .forRoutes('*');
    }
  }

  describe('should queue middleware when registered before init', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());

      // Register middleware before init - should be queued
      app.use(
        (
          _req: H3ServerRequest,
          res: PolyfilledResponse<H3ServerResponse>,
          next: () => void,
        ) => {
          res.setHeader('x-global-middleware', 'applied');
          next();
        },
      );

      // Now init the app - queued middleware should be registered
      await app.init();
    });

    it('should apply queued middleware after init', async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/test', {
          method: 'GET',
        }),
      ).then(async (res) => {
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ data: 'test_data' });
        // Verify both module-level and global middleware were applied
        expect(res.headers.get('x-middleware')).toBe('applied');
        expect(res.headers.get('x-global-middleware')).toBe('applied');
      });
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should work when app is initialized before middleware registration', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());

      // Initialize app first
      await app.init();

      // Now middleware registration should work
      app.use(
        (
          _req: H3ServerRequest,
          res: PolyfilledResponse<H3ServerResponse>,
          next: () => void,
        ) => {
          res.setHeader('x-global-middleware', 'applied');
          next();
        },
      );
    });

    it('should register middleware successfully after init', async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/test', {
          method: 'GET',
        }),
      ).then(async (res) => {
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ data: 'test_data' });
      });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
