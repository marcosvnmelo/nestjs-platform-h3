import { afterAll, beforeAll, describe, it } from '@rstest/core';
import request from 'supertest';

import type { Routes } from '@nestjs/core';
import { Controller, Get, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

describe('RouterModule (H3 adapter)', () => {
  let app: NestH3Application;

  abstract class BaseController {
    @Get()
    getName() {
      return this.constructor.name;
    }
  }

  @Controller('/parent-controller')
  class ParentController extends BaseController {}

  @Controller('/child-controller')
  class ChildController extends BaseController {}

  @Controller('no-slash-controller')
  class NoSlashController extends BaseController {}

  @Module({ controllers: [ParentController] })
  class ParentModule {}

  @Module({ controllers: [ChildController] })
  class ChildModule {}

  @Module({})
  class AuthModule {}

  @Module({})
  class PaymentsModule {}

  @Module({ controllers: [NoSlashController] })
  class NoSlashModule {}

  const routes1: Routes = [
    {
      path: 'parent',
      module: ParentModule,
      children: [
        {
          path: 'child',
          module: ChildModule,
        },
      ],
    },
  ];

  const routes2: Routes = [
    { path: 'v1', children: [AuthModule, PaymentsModule, NoSlashModule] },
  ];

  @Module({
    imports: [ParentModule, ChildModule, RouterModule.register(routes1)],
  })
  class MainModule {}

  @Module({
    imports: [
      AuthModule,
      PaymentsModule,
      NoSlashModule,
      RouterModule.register(routes2),
    ],
  })
  class AppModule {}

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MainModule, AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should hit the "ParentController"', async () => {
    await request(app.getHttpServer())
      .get('/parent/parent-controller')
      .expect(200, 'ParentController');
  });

  it('should hit the "ChildController"', async () => {
    await request(app.getHttpServer())
      .get('/parent/child/child-controller')
      .expect(200, 'ChildController');
  });

  it('should hit the "NoSlashController"', async () => {
    await request(app.getHttpServer())
      .get('/v1/no-slash-controller')
      .expect(200, 'NoSlashController');
  });
});
