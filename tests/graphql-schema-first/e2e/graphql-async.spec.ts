import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

import { AsyncApplicationModule } from '../src/async-options.module.ts';

// GraphQL libs only support Express and Fastify
describe.skip('GraphQL (async configuration)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    app = await NestFactory.create(AsyncApplicationModule, { logger: false });
    await app.init();
  });

  it(`should return query result`, async () => {
    await request(app.getHttpServer())
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
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
