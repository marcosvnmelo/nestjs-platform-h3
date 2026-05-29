import type { App } from 'supertest/types.d.ts';
import { afterAll, beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { RequestChainModule } from '../src/request-chain/request-chain.module.ts';
import { RequestChainService } from '../src/request-chain/request-chain.service.ts';

describe('Request scope (modules propagation)', () => {
  const OVERLAP_REQUEST_COUNT = 1000;
  let server: App;
  let app: NestH3Application;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestChainModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.listen(0);
    baseUrl = await app.getUrl();
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

    it(`should not fail`, () => {
      expect(RequestChainService.COUNTER).to.be.eql(3);
    });
  });

  describe('when service from parent module is request scoped under overlapping requests', function () {
    const TIMEOUT = 20_000;
    let counterBefore: number;
    let responses: request.Response[];

    beforeAll(async () => {
      counterBefore = RequestChainService.COUNTER;
      responses = await Promise.all(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
          request(baseUrl).get('/hello'),
        ),
      );
    });

    it(
      'should complete every overlapping request successfully',
      () => {
        expect(responses.map((response) => response.status)).to.deep.equal(
          Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 200),
        );
      },
      TIMEOUT,
    );

    it(
      'should create the request-scoped dependency chain for every overlapping request',
      () => {
        expect(RequestChainService.COUNTER - counterBefore).to.equal(
          OVERLAP_REQUEST_COUNT,
        );
      },
      TIMEOUT,
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
