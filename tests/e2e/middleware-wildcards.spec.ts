import { afterEach, describe, it } from '@rstest/core';
import request from 'supertest';

import type { MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';
const WILDCARD_VALUE = 'test_wildcard';
const EXCLUDE_VALUE = 'test_exclude';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('tests/wildcard_nested')
  wildcardNested() {
    return RETURN_VALUE;
  }

  @Get('legacy-wildcard/overview')
  legacyWildcard() {
    return RETURN_VALUE;
  }

  @Get('exclude')
  exclude() {
    return EXCLUDE_VALUE;
  }
}

@Module({
  imports: [AppModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((_req: any, res: any, _next: () => void) => {
        res.statusCode = 200;
        res.end(WILDCARD_VALUE);
      })
      .forRoutes('tests/*path', 'legacy-wildcard/*path')
      .apply((_req: any, res: any, _next: () => void) => {
        res.statusCode = 200;
        res.end(SCOPED_VALUE);
      })
      .exclude('exclude')
      .forRoutes(TestController)
      .apply((_req: any, res: any, _next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE);
      })
      .exclude('exclude')
      .forRoutes('*path');
  }
}

describe('Middleware with wildcards and patterns (H3 adapter)', () => {
  let app: NestH3Application;

  afterEach(async () => {
    await app.close();
  });

  it('forRoutes(*) should apply middleware to all routes', async () => {
    app = await createApp();
    await request(app.getHttpServer()).get('/hello').expect(200, RETURN_VALUE);
    await request(app.getHttpServer())
      .get('/exclude')
      .expect(200, EXCLUDE_VALUE);
  });

  it('forRoutes(*) with global prefix', async () => {
    app = await createApp((application) => application.setGlobalPrefix('api'));
    await request(app.getHttpServer())
      .get('/api/hello')
      .expect(200, RETURN_VALUE);
    await request(app.getHttpServer())
      .get('/api/exclude')
      .expect(200, EXCLUDE_VALUE);
  });

  it('forRoutes(TestController) should scope middleware to controller', async () => {
    app = await createApp();
    await request(app.getHttpServer()).get('/test').expect(200, SCOPED_VALUE);
    await request(app.getHttpServer())
      .get('/exclude')
      .expect(200, EXCLUDE_VALUE);
  });

  it('forRoutes(tests/*path) should apply middleware to nested wildcard routes', async () => {
    app = await createApp();
    await request(app.getHttpServer())
      .get('/tests/wildcard')
      .expect(200, WILDCARD_VALUE);
  });

  it('forRoutes(legacy-wildcard/*) should apply middleware to legacy wildcard routes', async () => {
    app = await createApp();
    await request(app.getHttpServer())
      .get('/legacy-wildcard/overview')
      .expect(200, WILDCARD_VALUE);
  });
});

async function createApp(
  beforeInit?: (app: NestH3Application) => void,
): Promise<NestH3Application> {
  const module = await Test.createTestingModule({
    imports: [TestModule],
  }).compile();

  const app = module.createNestApplication<NestH3Application>(new H3Adapter());

  if (beforeInit) {
    beforeInit(app);
  }
  await app.init();

  return app;
}
