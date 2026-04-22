import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

// GraphQL libs only support Express and Fastify
describe.skip('GraphQL Pipes', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  it(`should throw an error`, async () => {
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        operationName: null,
        variables: {},
        query:
          'mutation {\n  addRecipe(newRecipeData: {title: "test", ingredients: []}) {\n    id\n  }\n}\n',
      })
      .expect(200, {
        data: null,
        errors: [
          {
            extensions: {
              code: 'BAD_REQUEST',
              originalError: {
                error: 'Bad Request',
                message: [
                  'description must be longer than or equal to 30 characters',
                ],
                statusCode: 400,
              },
            },
            locations: [
              {
                column: 3,
                line: 2,
              },
            ],
            message: 'Bad Request Exception',
            path: ['addRecipe'],
          },
        ],
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
