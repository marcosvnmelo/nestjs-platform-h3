import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { HttpStatus } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { ErrorsController } from '../src/errors/errors.controller';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
} from '../src/filters/exception.filter';

describe('Exception Filters (H3 adapter)', () => {
  describe('Default exception handling', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('/GET sync error', async () => {
      await request(app.getHttpServer())
        .get('/errors/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it('/GET async error', async () => {
      await request(app.getHttpServer())
        .get('/errors/async')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it('/GET not found error', async () => {
      await request(app.getHttpServer())
        .get('/errors/not-found')
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toBe('Resource not found');
          expect(res.body.statusCode).toBe(404);
        });
    });

    it('/GET internal server error', async () => {
      await request(app.getHttpServer())
        .get('/errors/internal')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect((res) => {
          expect(res.body.message).toBe('Internal server error');
          expect(res.body.statusCode).toBe(500);
        });
    });

    it('/GET unexpected error should return 500', async () => {
      await request(app.getHttpServer())
        .get('/errors/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect((res) => {
          expect(res.body.statusCode).toBe(500);
        });
    });
  });

  describe('HttpExceptionFilter', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
        providers: [
          {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should apply custom filter to HTTP exceptions', async () => {
      await request(app.getHttpServer())
        .get('/errors/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.custom).toBe(true);
          expect(res.body.statusCode).toBe(400);
          expect(res.body.timestamp).not.toBeUndefined();
        });
    });
  });

  describe('AllExceptionsFilter', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
        providers: [
          {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should catch all exceptions including non-HTTP', async () => {
      await request(app.getHttpServer())
        .get('/errors/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect((res) => {
          expect(res.body.allExceptionsFilter).toBe(true);
          expect(res.body.statusCode).toBe(500);
        });
    });
  });
});
