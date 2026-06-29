import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { wrapH3App } from '@marcosvnmelo/testing-shared';

import { AppModule } from '../src/app.module.ts';

describe('Body Parser (Fastify Application)', () => {
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
        .useBodyParser('json', {
          limit: Buffer.from(stringLimit).byteLength,
        });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: stringLimit,
      });

      expect(JSON.parse(response.body)).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: stringOverLimit,
      });

      expect(response.statusCode).to.equal(413);
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
        .useBodyParser('urlencoded', {
          limit: Buffer.from(stringLimit).byteLength,
        });

      await app.init();
    });

    it('should allow request with matching body limit', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: stringLimit,
      });

      expect(JSON.parse(response.body)).to.eql({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: stringOverLimit,
      });

      expect(response.statusCode).to.equal(413);
    });
  });
});
