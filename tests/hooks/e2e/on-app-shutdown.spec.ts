import { describe, expect, it, rs } from '@rstest/core';

import { Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable()
class TestInjectable implements OnApplicationShutdown {
  onApplicationShutdown = rs.fn();
}

describe('OnApplicationShutdown', () => {
  it('should call onApplicationShutdown when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationShutdown).toHaveBeenCalled();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements OnApplicationShutdown {
      onApplicationShutdown = rs.fn();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnApplicationShutdown {
      // @ts-expect-error - unused on original code
      constructor(private bb: BB) {}
      onApplicationShutdown = rs.fn();
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
    expect(aa.onApplicationShutdown.mock.invocationCallOrder[0]).toBeLessThan(
      bb.onApplicationShutdown.mock.invocationCallOrder[0],
    );
  });

  it('should call `onApplicationShutdown` on all providers in a single module', async () => {
    @Injectable()
    class A implements OnApplicationShutdown {
      onApplicationShutdown = rs.fn();
    }

    @Injectable()
    class AHost implements OnApplicationShutdown {
      // @ts-expect-error - unused on original code
      constructor(private a: A) {}
      onApplicationShutdown = rs.fn();
    }

    @Injectable()
    class Composition implements OnApplicationShutdown {
      constructor(
        // @ts-expect-error - unused on original code
        private a: A,
        // @ts-expect-error - unused on original code
        private host: AHost,
      ) {}
      onApplicationShutdown = rs.fn();
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

    expect(composition.onApplicationShutdown).toHaveBeenCalled();
    expect(parent.onApplicationShutdown).toHaveBeenCalled();
    expect(child.onApplicationShutdown).toHaveBeenCalled();
  });
});
