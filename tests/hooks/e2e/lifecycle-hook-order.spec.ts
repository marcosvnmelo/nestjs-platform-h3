import { describe, expect, it, rs } from '@rstest/core';

import {
  BeforeApplicationShutdown,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable()
class TestInjectable
  implements
    OnApplicationBootstrap,
    OnModuleInit,
    OnModuleDestroy,
    OnApplicationShutdown,
    BeforeApplicationShutdown
{
  onApplicationBootstrap = rs.fn();
  beforeApplicationShutdown = rs.fn();
  onApplicationShutdown = rs.fn();
  onModuleDestroy = rs.fn();
  onModuleInit = rs.fn();
}

describe('Lifecycle Hook Order', () => {
  it('should call the lifecycle hooks in the correct order', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init();
    await app.close();

    const instance = module.get(TestInjectable);
    const order = [
      instance.onModuleInit,
      instance.onApplicationBootstrap,
      instance.onModuleDestroy,
      instance.beforeApplicationShutdown,
      instance.onApplicationShutdown,
    ];
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i].mock.invocationCallOrder[0]).toBeLessThan(
        order[i + 1].mock.invocationCallOrder[0],
      );
    }
  });
});
