import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

// GraphQL libs only support Express and Fastify
describe.skip('GraphQL - Guards', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  it(`should throw an error`, async () => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        operationName: null,
        variables: {},
        query: '{\n  recipe(id: "3") {\n    id\n  }\n}\n',
      })
      .expect(200, {
        data: null,
        errors: [
          {
            message: 'Unauthorized error',
            locations: [
              {
                line: 2,
                column: 3,
              },
            ],
            path: ['recipe'],
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
        ],
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
