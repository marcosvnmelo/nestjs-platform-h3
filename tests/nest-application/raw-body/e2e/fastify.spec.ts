import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { wrapH3App } from '@marcosvnmelo/testing-shared';

import { FastifyModule } from '../src/fastify.module.ts';

describe('Raw body (Fastify Application)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [FastifyModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestH3Application>(
      new H3Adapter(),
      {
        rawBody: true,
      },
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('application/json', () => {
    const body = '{ "amount":0.0 }';

    it('should return exact post body', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/json' },
        payload: body,
      });

      expect(JSON.parse(response.body)).to.eql({
        parsed: {
          amount: 0,
        },
        raw: body,
      });
    });

    // TODO: H3 does not fail if body is empty
    it.skip('should fail if post body is empty', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
        },
      });

      // Unlike Express, when you send a POST request without a body
      // with Fastify, Fastify will throw an error because it isn't valid
      // JSON. See fastify/fastify#297.
      expect(response.statusCode).to.equal(400);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const body = 'content=this is a post\'s content by "Nest"';

    it('should return exact post body', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload: body,
      });

      expect(JSON.parse(response.body)).to.eql({
        parsed: {
          content: 'this is a post\'s content by "Nest"',
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      const response = await wrapH3App(app).inject({
        method: 'POST',
        url: '/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      expect(response.statusCode).to.equal(201);
    });
  });
});
