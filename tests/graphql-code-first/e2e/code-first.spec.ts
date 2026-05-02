import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

// HACK: GraphQL libs only support Express and Fastify natively
// Calling "app.setAdapterDisguise('express')" + "@nestjs/apollo" patch is required
describe('GraphQL - Code-first', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adapter = new H3Adapter();
    adapter.setAdapterDisguise('express');
    app = module.createNestApplication<NestH3Application>(adapter);
    await app.init();
  });

  it(`should return query result`, async () => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        operationName: null,
        variables: {},
        query: '{\n  recipes {\n    id\n  }\n}\n',
      })
      .expect(200, {
        data: {
          recipes: [],
        },
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
