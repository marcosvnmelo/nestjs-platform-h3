import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Controller, Get, Module, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import {
  functionalMiddleware,
  LoggerMiddleware,
} from '../src/middleware/logger.middleware';

@Controller('test')
class TestController {
  @Get()
  test(@Req() req: any) {
    return {
      middlewareApplied: req.middlewareApplied || false,
      functionalMiddlewareApplied: req.functionalMiddlewareApplied || false,
    };
  }

  @Get('other')
  other(@Req() req: any) {
    return {
      middlewareApplied: req.middlewareApplied || false,
    };
  }

  @Get('excluded')
  excluded(@Req() req: any) {
    return {
      middlewareApplied: req.middlewareApplied || false,
    };
  }
}

@Module({
  controllers: [TestController],
})
class TestModuleWithClassMiddleware implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('test');
  }
}

@Module({
  controllers: [TestController],
})
class TestModuleWithFunctionalMiddleware implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(functionalMiddleware).forRoutes('test');
  }
}

@Module({
  controllers: [TestController],
})
class TestModuleWithMultipleMiddleware implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, functionalMiddleware).forRoutes('test');
  }
}

@Module({
  controllers: [TestController],
})
class TestModuleWithExclude implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude('test/excluded')
      .forRoutes(TestController);
  }
}

describe('Middleware (H3 adapter)', () => {
  describe('Class-based middleware', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModuleWithClassMiddleware],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply class middleware to matched routes', async () => {
      await request(app.getHttpServer()).get('/test').expect(200).expect({
        middlewareApplied: true,
        functionalMiddlewareApplied: false,
      });
    });
  });

  describe('Functional middleware', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModuleWithFunctionalMiddleware],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply functional middleware to matched routes', async () => {
      await request(app.getHttpServer()).get('/test').expect(200).expect({
        middlewareApplied: false,
        functionalMiddlewareApplied: true,
      });
    });
  });

  describe('Multiple middleware', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModuleWithMultipleMiddleware],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply multiple middleware in order', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect({ middlewareApplied: true, functionalMiddlewareApplied: true });
    });
  });

  describe('Middleware with exclude', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [TestModuleWithExclude],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply middleware to non-excluded routes', async () => {
      await request(app.getHttpServer()).get('/test').expect(200).expect({
        middlewareApplied: true,
        functionalMiddlewareApplied: false,
      });
    });

    it('should not apply middleware to excluded routes', async () => {
      await request(app.getHttpServer())
        .get('/test/excluded')
        .expect(200)
        .expect({ middlewareApplied: false });
    });
  });
});
