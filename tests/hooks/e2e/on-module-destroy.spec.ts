import { describe, expect, it, rs } from '@rstest/core';

import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable()
class TestInjectable implements OnModuleDestroy {
  onModuleDestroy = rs.fn();
}

describe('OnModuleDestroy', () => {
  it('should call onModuleDestroy when application closes', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.close();
    const instance = module.get(TestInjectable);
    expect(instance.onModuleDestroy).toHaveBeenCalled();
  });

  it('should not throw an error when onModuleDestroy is null', async () => {
    const module = await Test.createTestingModule({
      providers: [{ provide: 'TEST', useValue: { onModuleDestroy: null } }],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init().then((obj) => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should not throw an error when onModuleDestroy is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onModuleDestroy: undefined } },
      ],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init().then((obj) => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should sort modules by distance (topological sort) - DESC order', async () => {
    @Injectable()
    class BB implements OnModuleDestroy {
      onModuleDestroy = rs.fn();
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnModuleDestroy {
      // @ts-expect-error - unused on original code
      constructor(private bb: BB) {}
      onModuleDestroy = rs.fn();
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
    expect(aa.onModuleDestroy.mock.invocationCallOrder[0]).toBeLessThan(
      bb.onModuleDestroy.mock.invocationCallOrder[0],
    );
  });

  it('should call `onModuleDestroy` on all providers in a single module', async () => {
    @Injectable()
    class A implements OnModuleDestroy {
      onModuleDestroy = rs.fn();
    }

    @Injectable()
    class AHost implements OnModuleDestroy {
      // @ts-expect-error - unused on original code
      constructor(private a: A) {}
      onModuleDestroy = rs.fn();
    }

    @Injectable()
    class Composition implements OnModuleDestroy {
      constructor(
        // @ts-expect-error - unused on original code
        private a: A,
        // @ts-expect-error - unused on original code
        private host: AHost,
      ) {}
      onModuleDestroy = rs.fn();
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
    expect(composition.onModuleDestroy).toHaveBeenCalled();
    expect(parent.onModuleDestroy).toHaveBeenCalled();
    expect(child.onModuleDestroy).toHaveBeenCalled();
  });
});
