import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { LazyController } from '../src/lazy.controller.ts';

describe('Lazy Requested Scoped providers', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LazyController],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  it('should not recreate dependencies for default scope', async () => {
    const resultOne = await request(app.getHttpServer()).get('/lazy/request');

    expect(resultOne.text).toBe('Hi! Counter is 1');
    expect(resultOne.statusCode).toBe(200);

    const resultTwo = await request(app.getHttpServer()).get('/lazy/request');

    expect(resultTwo.text).toBe('Hi! Counter is 2');
    expect(resultTwo.statusCode).toBe(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
