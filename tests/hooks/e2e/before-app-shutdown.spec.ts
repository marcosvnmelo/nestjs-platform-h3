import { describe, expect, it, rs } from '@rstest/core';

import { BeforeApplicationShutdown, Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable()
class TestInjectable implements BeforeApplicationShutdown {
  beforeApplicationShutdown = rs.fn();
}

describe('BeforeApplicationShutdown', () => {
  it('should call `beforeApplicationShutdown` when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.beforeApplicationShutdown).toHaveBeenCalled();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements BeforeApplicationShutdown {
      beforeApplicationShutdown = rs.fn();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements BeforeApplicationShutdown {
      // @ts-expect-error - unused on original code
      constructor(private bb: BB) {}
      beforeApplicationShutdown = rs.fn();
    }
    @Module({
      imports: [B],
      providers: [AA],
    })
    class A {}

    const module = await Test.createTestingModule({
      imports: [A],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init();
    await app.close();

    const aa = module.get(AA);
    const bb = module.get(BB);
    expect(
      aa.beforeApplicationShutdown.mock.invocationCallOrder[0],
    ).toBeLessThan(bb.beforeApplicationShutdown.mock.invocationCallOrder[0]);
  });

  it('should call `beforeApplicationShutdown` on all providers in a single module', async () => {
    @Injectable()
    class A implements BeforeApplicationShutdown {
      beforeApplicationShutdown = rs.fn();
    }

    @Injectable()
    class AHost implements BeforeApplicationShutdown {
      // @ts-expect-error - unused on original code
      constructor(private a: A) {}
      beforeApplicationShutdown = rs.fn();
    }

    @Injectable()
    class Composition implements BeforeApplicationShutdown {
      constructor(
        // @ts-expect-error - unused on original code
        private a: A,
        // @ts-expect-error - unused on original code
        private host: AHost,
      ) {}
      beforeApplicationShutdown = rs.fn();
    }

    @Module({
      providers: [AHost, A, Composition],
    })
    class AModule {}

    const module = await Test.createTestingModule({
      imports: [AModule],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init();
    await app.close();

    const child = module.get(A);
    const parent = module.get(AHost);
    const composition = module.get(Composition);

    expect(composition.beforeApplicationShutdown).toHaveBeenCalled();
    expect(parent.beforeApplicationShutdown).toHaveBeenCalled();
    expect(child.beforeApplicationShutdown).toHaveBeenCalled();
  });
});
