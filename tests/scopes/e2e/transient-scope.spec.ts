import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Injectable, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

import { NestedTransientModule } from '../src/nested-transient/nested-transient.module.ts';
import { Guard } from '../src/transient/guards/request-scoped.guard.ts';
import { HelloController } from '../src/transient/hello.controller.ts';
import { HelloModule } from '../src/transient/hello.module.ts';
import { Interceptor } from '../src/transient/interceptors/logging.interceptor.ts';
import { UserByIdPipe } from '../src/transient/users/user-by-id.pipe.js';
import { UsersService } from '../src/transient/users/users.service.ts';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Transient scope', () => {
  describe('when transient scope is used', () => {
    let server: any;
    let app: NestH3Application;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          HelloModule.forRoot({
            provide: 'META',
            useClass: Meta,
            scope: Scope.TRANSIENT,
          }),
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      server = app.getHttpServer();
      await app.init();
    });

    describe('and when one service is request scoped', () => {
      beforeAll(async () => {
        const performHttpCall = (end: Function) =>
          request(server)
            .get('/hello')
            .end((err) => {
              if (err) return end(err);
              end();
            });
        await new Promise<any>((resolve) => performHttpCall(resolve));
        await new Promise<any>((resolve) => performHttpCall(resolve));
        await new Promise<any>((resolve) => performHttpCall(resolve));
      });

      it(`should create controller for each request`, async () => {
        expect(HelloController.COUNTER).toEqual(3);
      });

      it(`should create service for each request`, async () => {
        expect(UsersService.COUNTER).toEqual(3);
      });

      it(`should create provider for each inquirer`, async () => {
        expect(Meta.COUNTER).toEqual(7);
      });

      it(`should create transient pipe for each controller (3 requests, 1 static)`, async () => {
        expect(UserByIdPipe.COUNTER).toEqual(4);
      });

      it(`should create transient interceptor for each controller (3 requests, 1 static)`, async () => {
        expect(Interceptor.COUNTER).toEqual(4);
      });

      it(`should create transient guard for each controller (3 requests, 1 static)`, async () => {
        expect(Guard.COUNTER).toEqual(4);
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when there is a nested structure of transient providers', () => {
    let app: NestH3Application;

    @Injectable({ scope: Scope.TRANSIENT })
    class DeepTransient {
      public initialized = false;

      constructor() {
        this.initialized = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class LoggerService {
      public context?: string;
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class SecondService {
      constructor(public readonly loggerService: LoggerService) {
        this.loggerService.context = 'SecondService';
      }
    }

    @Injectable()
    class FirstService {
      constructor(
        public readonly secondService: SecondService,
        public readonly loggerService: LoggerService,
        public readonly deepTransient: DeepTransient,
      ) {
        this.loggerService.context = 'FirstService';
      }
    }

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [FirstService, SecondService, LoggerService, DeepTransient],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    it('should create a new instance of the transient provider for each provider', async () => {
      const firstService1 = app.get(FirstService);

      expect(firstService1.secondService.loggerService.context).toBe(
        'SecondService',
      );
      expect(firstService1.loggerService.context).toBe('FirstService');
      expect(firstService1.deepTransient.initialized).toBe(true);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when DEFAULT scoped provider has deeply nested TRANSIENT chain', () => {
    let app: NestH3Application;

    @Injectable({ scope: Scope.TRANSIENT })
    class DeepNestedTransient {
      public static constructorCalled = false;

      constructor() {
        DeepNestedTransient.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class MiddleTransient {
      constructor(public readonly nested: DeepNestedTransient) {}
    }

    @Injectable()
    class RootService {
      constructor(public readonly middle: MiddleTransient) {}
    }

    beforeAll(async () => {
      DeepNestedTransient.constructorCalled = false;

      const module = await Test.createTestingModule({
        providers: [RootService, MiddleTransient, DeepNestedTransient],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    it('should call constructor of deeply nested TRANSIENT provider', async () => {
      const rootService = app.get(RootService);

      expect(DeepNestedTransient.constructorCalled).toBe(true);
      expect(rootService.middle.nested).toBeInstanceOf(DeepNestedTransient);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when nested transient providers are used in request scope', () => {
    let server: any;
    let app: NestH3Application;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [NestedTransientModule],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      server = app.getHttpServer();
      await app.init();
    });

    describe('when handling HTTP requests', () => {
      let response: any;

      beforeAll(async () => {
        const performHttpCall = () =>
          new Promise<any>((resolve, reject) => {
            request(server)
              .get('/nested-transient')
              .end((err, res) => {
                if (err) return reject(err);
                resolve(res);
              });
          });

        response = await performHttpCall();
      });

      it('should isolate nested transient instances for each parent service', async () => {
        expect(response.body.firstServiceContext).toBe('NESTED-FirstService');
        expect(response.body.secondServiceContext).toBe('NESTED-SecondService');
        expect(response.body.firstServiceNestedId).not.toBe(
          response.body.secondServiceNestedId,
        );
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });
});
