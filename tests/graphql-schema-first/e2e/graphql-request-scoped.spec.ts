import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { ApolloDriver } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { CatsRequestScopedService } from '../src/cats/cats-request-scoped.service.ts';
import { CatsModule } from '../src/cats/cats.module.ts';

// GraphQL libs only support Express and Fastify
describe.skip('GraphQL request scoped', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CatsModule.enableRequestScope(),
        GraphQLModule.forRoot({
          driver: ApolloDriver,
          typePaths: [
            join(import.meta.dirname, '..', 'src', '**', '*.graphql'),
          ],
        }),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();

    const performHttpCall = (end: Function) =>
      request(app.getHttpServer())
        .post('/graphql')
        .send({
          operationName: null,
          variables: {},
          query: '{\n  getCats {\n    id\n  }\n}\n',
        })
        .expect(200, {
          data: {
            getCats: [
              {
                id: 1,
              },
            ],
          },
        })
        .end((err) => {
          if (err) return end(err);
          end();
        });

    await new Promise((resolve) => performHttpCall(resolve));
    await new Promise((resolve) => performHttpCall(resolve));
    await new Promise((resolve) => performHttpCall(resolve));
  });

  it(`should create resolver for each incoming request`, async () => {
    expect(CatsRequestScopedService.COUNTER).toEqual(3);
  });

  afterEach(async () => {
    await app.close();
  });
});
