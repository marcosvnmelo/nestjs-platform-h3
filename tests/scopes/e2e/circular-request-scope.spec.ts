import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { HelloController } from '../src/circular-hello/hello.controller.ts';
import { HelloModule } from '../src/circular-hello/hello.module.ts';
import { HelloService } from '../src/circular-hello/hello.service.ts';
import { UsersService } from '../src/circular-hello/users/users.service.ts';

class Meta {
  static COUNTER = 0;
  // @ts-expect-error - unused on original code
  constructor(private readonly helloService: HelloService) {
    Meta.COUNTER++;
  }
}

describe('Circular request scope', () => {
  let server: App;
  let app: NestH3Application;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HelloModule.forRoot({
          provide: 'META',
          useClass: Meta,
          scope: Scope.REQUEST,
        }),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  describe('when one service is request scoped', () => {
    beforeAll(async () => {
      const performHttpCall = (end: Function) =>
        request(server)
          .get('/hello')
          .end((err, _res) => {
            if (err) return end(err);
            end();
          });
      await new Promise((resolve) => performHttpCall(resolve));
      await new Promise((resolve) => performHttpCall(resolve));
      await new Promise((resolve) => performHttpCall(resolve));
    });

    it(`should create controller for each request`, async () => {
      expect(HelloController.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, async () => {
      expect(UsersService.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, async () => {
      expect(HelloService.COUNTER).toEqual(3);
    });

    it(`should create provider for each inquirer`, async () => {
      expect(Meta.COUNTER).toEqual(3);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
