import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { fetchAppHandler } from '@marcosvnmelo/testing-shared';

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
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: stringLimit,
        }),
      );

      await expect(response.json()).resolves.toEqual({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: stringOverLimit,
        }),
      );

      expect(response.status).toBe(413);
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
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: stringLimit,
        }),
      );

      await expect(response.json()).resolves.toEqual({
        raw: stringLimit,
      });
    });

    it('should fail if post body is larger than limit', async () => {
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: stringOverLimit,
        }),
      );

      expect(response.status).toBe(413);
    });
  });
});
