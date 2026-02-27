import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Controller, Get, Param, UsePipes } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import {
  ParseIntPipe,
  TransformPipe,
  ValidationPipe,
} from '../src/pipes/validation.pipe';

@Controller('test')
class TestController {
  @Get('parse-int/:id')
  parseIntTest(@Param('id', ParseIntPipe) id: number) {
    return { id, type: typeof id };
  }

  @Get('transform/:value')
  @UsePipes(TransformPipe)
  transformTest(@Param('value') value: string) {
    return { value };
  }
}

describe('Pipes (H3 adapter)', () => {
  describe('ParseIntPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should parse valid integer string', async () => {
      await request(app.getHttpServer())
        .get('/test/parse-int/42')
        .expect(200)
        .expect({ id: 42, type: 'number' });
    });

    it('should fail for non-numeric string', async () => {
      await request(app.getHttpServer())
        .get('/test/parse-int/abc')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('numeric string is expected');
        });
    });
  });

  describe('TransformPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should transform value to uppercase', async () => {
      await request(app.getHttpServer())
        .get('/test/transform/hello')
        .expect(200)
        .expect({ value: 'HELLO' });
    });
  });

  describe('Global ValidationPipe', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_PIPE,
            useValue: new ValidationPipe(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should pass validation for valid params', async () => {
      await request(app.getHttpServer()).get('/test/parse-int/123').expect(200);
    });
  });
});
