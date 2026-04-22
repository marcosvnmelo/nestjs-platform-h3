import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { Guard } from '../src/msvc/guards/request-scoped.guard.ts';
import { HelloController } from '../src/msvc/hello.controller.ts';
import { HelloModule } from '../src/msvc/hello.module.ts';
import { Interceptor } from '../src/msvc/interceptors/logging.interceptor.ts';
import { UsersService } from '../src/msvc/users/users.service.ts';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Request scope (microservices)', () => {
  let server: App;
  let app: NestH3Application;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HelloModule.forRoot({
          provide: 'META',
          useClass: Meta,
        }),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    app.connectMicroservice<MicroserviceOptions>({ transport: Transport.TCP });

    server = app.getHttpServer();
    await app.init();
    await app.startAllMicroservices();
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

    it(`should share static provider across requests`, async () => {
      expect(Meta.COUNTER).toEqual(1);
    });

    it(`should create request scoped interceptor for each request`, async () => {
      expect(Interceptor.COUNTER).toEqual(3);
      expect(Interceptor.REQUEST_SCOPED_DATA).toEqual([1, 1, 1]);
    });

    it(`should create request scoped guard for each request`, async () => {
      expect(Guard.COUNTER).toEqual(3);
      expect(Guard.REQUEST_SCOPED_DATA).toEqual([1, 1, 1]);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
