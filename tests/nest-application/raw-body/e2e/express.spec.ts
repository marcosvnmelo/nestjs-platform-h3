import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { ExpressModule } from '../src/express.module.ts';

describe('Raw body (Express Application)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ExpressModule],
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
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(201);

      expect(response.body).toEqual({
        parsed: {
          amount: 0,
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/json')
        .expect(201);
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    const body = 'content=this is a post\'s content by "Nest"';

    it('should return exact post body', async () => {
      const response = await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(body)
        .expect(201);

      expect(response.body).toEqual({
        parsed: {
          content: 'this is a post\'s content by "Nest"',
        },
        raw: body,
      });
    });

    it('should work if post body is empty', async () => {
      await request(app.getHttpServer())
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(201);
    });
  });
});
