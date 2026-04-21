import type { App } from 'supertest/types.d.ts';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { ErrorsController } from '../src/errors/errors.controller.ts';

describe('Error messages', () => {
  let server: App;

  describe('H3', () => {
    let app: NestH3Application;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      server = app.getHttpServer();
      await app.init();
    });

    it(`/GET`, async () => {
      await request(server).get('/sync').expect(HttpStatus.BAD_REQUEST).expect({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Integration test',
      });
    });

    it(`/GET (Promise/async)`, async () => {
      await request(server)
        .get('/async')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it(`/GET (InternalServerError despite custom content-type)`, async () => {
      await request(server)
        .get('/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal server error',
        });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
