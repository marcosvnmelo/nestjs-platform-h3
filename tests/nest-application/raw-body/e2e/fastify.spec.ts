import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { fetchAppHandler } from '@marcosvnmelo/testing-shared';

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
      const response = await request(app.getHttpServer())
        .post('/')
        .set('content-type', 'application/json')
        .send(body)
        .expect(201);

      expect(response.body).toEqual({
        parsed: {
          amount: 0,
        },
        raw: body,
      });
    });

    it.skip('should fail if post body is empty', async () => {
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'accept': 'application/json',
          },
        }),
      );

      // Unlike Express, when you send a POST request without a body
      // with Fastify, Fastify will throw an error because it isn't valid
      // JSON. See fastify/fastify#297.
      expect(response.status).toBe(400);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const body = 'content=this is a post\'s content by "Nest"';

    it('should return exact post body', async () => {
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        }),
      );

      await expect(response.json()).resolves.toEqual({
        parsed: {
          content: 'this is a post\'s content by "Nest"',
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      const response = await fetchAppHandler(
        app,
        new Request('http://localhost:3000', {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      expect(response.status).toBe(201);
    });
  });
});
