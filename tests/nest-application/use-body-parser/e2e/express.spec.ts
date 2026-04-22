import type { OptionsUrlencoded } from 'body-parser';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('Body Parser (Express Application)', () => {
  const moduleFixture = Test.createTestingModule({
    imports: [AppModule],
  });
  let app: NestH3Application;

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const stringLimit = '{ "msg": "Hello, World" }';
    const stringOverLimit = '{ "msg": "Hello, World!" }';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestH3Application>(new H3Adapter(), {
          rawBody: true,
          logger: false,
        })
        .useBodyParser('json', { limit: Buffer.from(stringLimit).byteLength });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(stringLimit)
        .expect(201);

      expect(response.body).toEqual({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .send(stringOverLimit)
        .expect(413);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const stringLimit = 'msg=Hello, World';
    const stringOverLimit = 'msg=Hello, World!';

    beforeEach(async () => {
      const testFixture = await moduleFixture.compile();

      app = testFixture
        .createNestApplication<NestH3Application>(new H3Adapter(), {
          rawBody: true,
          logger: false,
        })
        .useBodyParser<OptionsUrlencoded>('urlencoded', {
          limit: Buffer.from(stringLimit).byteLength,
          extended: true,
        });

      await app.init();
    });
    it('should allow request with matching body limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(stringLimit)
        .expect(201);

      expect(response.body).toEqual({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(stringOverLimit)
        .expect(413);
    });
  });
});
