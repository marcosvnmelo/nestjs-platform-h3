import { describe, expect, it, rs } from '@rstest/core';

import { Injectable, Module, OnApplicationBootstrap } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable()
class TestInjectable implements OnApplicationBootstrap {
  onApplicationBootstrap = rs.fn();
}

describe('OnApplicationBootstrap', () => {
  it('should call onApplicationBootstrap when application starts', async () => {
    const module = await Test.createTestingModule({
      providers: [TestInjectable],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init();
    const instance = module.get(TestInjectable);
    expect(instance.onApplicationBootstrap).toHaveBeenCalled();
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is null', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: null } },
      ],
    }).compile();

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.init().then((obj) => expect(obj).not.toBeUndefined());
    await app.close();
  });

  it('should not throw an error when onApplicationBootstrap is undefined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: 'TEST', useValue: { onApplicationBootstrap: undefined } },
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
    class BB implements OnApplicationBootstrap {
      public field!: string;
      async onApplicationBootstrap() {
        this.field = 'b-field';
      }
    }

    @Module({
      providers: [BB],
      exports: [BB],
    })
    class B {}

    @Injectable()
    class AA implements OnApplicationBootstrap {
      public field!: string;
      constructor(private bb: BB) {}

      async onApplicationBootstrap() {
        this.field = this.bb.field + '_a-field';
      }
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

    const instance = module.get(AA);
    expect(instance.field).toBe('b-field_a-field');
    await app.close();
  });

  it('should call `onApplicationBootstrap` on all providers in a single module', async () => {
    @Injectable()
    class A implements OnApplicationBootstrap {
      onApplicationBootstrap = rs.fn();
    }

    @Injectable()
    class AHost implements OnApplicationBootstrap {
      // @ts-expect-error - unused on original code
      constructor(private a: A) {}
      onApplicationBootstrap = rs.fn();
    }

    @Injectable()
    class Composition implements OnApplicationBootstrap {
      constructor(
        // @ts-expect-error - unused on original code
        private a: A,
        // @ts-expect-error - unused on original code
        private host: AHost,
      ) {}
      onApplicationBootstrap = rs.fn();
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

    expect(child.onApplicationBootstrap).toHaveBeenCalled();
    expect(parent.onApplicationBootstrap).toHaveBeenCalled();
    expect(composition.onApplicationBootstrap).toHaveBeenCalled();
  });
});
