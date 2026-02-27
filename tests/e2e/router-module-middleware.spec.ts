import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import type { MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
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
      .apply((_req: any, res: any, _next: () => void) => {
        res.statusCode = 200;
        res.end(SCOPED_VALUE);
      })
      .forRoutes(TestController);
  }
}

describe('RouterModule with Middleware (H3 adapter)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TestModule,
        RouterModule.register([
          {
            path: '/module-path/',
            module: TestModule,
          },
        ]),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('forRoutes(TestController) - /test', async () => {
    await request(app.getHttpServer())
      .get('/module-path/test')
      .expect(200, SCOPED_VALUE);
  });

  it('forRoutes(TestController) - /test2', async () => {
    await request(app.getHttpServer())
      .get('/module-path/test2')
      .expect(200, SCOPED_VALUE);
  });
});
