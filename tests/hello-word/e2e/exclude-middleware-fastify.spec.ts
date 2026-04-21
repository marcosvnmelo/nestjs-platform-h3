import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  Post,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  H3Adapter,
  H3ServerRequest,
  H3ServerResponse,
  NestH3Application,
  PolyfilledResponse,
} from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('test/test')
  testTest() {
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
    return RETURN_VALUE;
  }

  @Get('middleware')
  middleware() {
    return RETURN_VALUE;
  }

  @Post('middleware')
  noMiddleware() {
    return RETURN_VALUE;
  }

  @Get('wildcard/overview')
  testOverview() {
    return RETURN_VALUE;
  }

  @Get('legacy-wildcard/overview')
  testLegacyWildcard() {
    return RETURN_VALUE;
  }

  @Get('splat-wildcard/overview')
  testSplatWildcard() {
    return RETURN_VALUE;
  }

  @Get('overview/:id')
  overviewById() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [AppModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        (
          _req: H3ServerRequest,
          res: PolyfilledResponse<H3ServerResponse>,
          _next: () => void,
        ) => res.end(MIDDLEWARE_VALUE),
      )
      .exclude(
        'test',
        'overview/:id',
        'wildcard/*',
        'legacy-wildcard/(.*)',
        'splat-wildcard/*splat',
        {
          path: 'middleware',
          method: RequestMethod.POST,
        },
      )
      .forRoutes('*');
  }
}

describe('Exclude middleware (fastify)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication<NestH3Application>(new H3Adapter());

    await app.init();
  });

  it(`should exclude "/test" endpoint`, async () => {
    await request(app.getHttpServer()).get('/test').expect(200, RETURN_VALUE);
  });

  it(`should not exclude "/test/test" endpoint`, async () => {
    await request(app.getHttpServer())
      .get('/test/test')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should not exclude "/test2" endpoint`, async () => {
    await request(app.getHttpServer())
      .get('/test2')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should run middleware for "/middleware" endpoint`, async () => {
    await request(app.getHttpServer())
      .get('/middleware')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it(`should exclude POST "/middleware" endpoint`, async () => {
    await request(app.getHttpServer())
      .post('/middleware')
      .expect(201, RETURN_VALUE);
  });

  it(`should exclude "/overview/:id" endpoint (by param)`, async () => {
    await request(app.getHttpServer())
      .get('/overview/1')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/wildcard/overview" endpoint (by wildcard)`, async () => {
    await request(app.getHttpServer())
      .get('/wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/legacy-wildcard/overview" endpoint (by wildcard, legacy syntax)`, async () => {
    await request(app.getHttpServer())
      .get('/legacy-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  it(`should exclude "/splat-wildcard/overview" endpoint (by wildcard, new syntax)`, async () => {
    await request(app.getHttpServer())
      .get('/splat-wildcard/overview')
      .expect(200, RETURN_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
