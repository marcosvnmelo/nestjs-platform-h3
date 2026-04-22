import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { RequestChainModule } from '../src/request-chain/request-chain.module.ts';
import { RequestChainService } from '../src/request-chain/request-chain.service.ts';

describe('Request scope (modules propagation)', () => {
  let server: App;
  let app: NestH3Application;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestChainModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  describe('when service from parent module is request scoped', () => {
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

    it(`should not fail`, async () => {
      expect(RequestChainService.COUNTER).toEqual(3);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
