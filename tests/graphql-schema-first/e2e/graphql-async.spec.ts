import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AsyncApplicationModule } from '../src/async-options.module.ts';

// HACK: GraphQL libs only support Express and Fastify natively
// Calling "app.setAdapterDisguise('express')" + "@nestjs/apollo" patch is required
describe('GraphQL (async configuration)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const adapter = new H3Adapter();
    adapter.setAdapterDisguise('express');
    app = await NestFactory.create(AsyncApplicationModule, adapter, {
      logger: false,
    });
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
