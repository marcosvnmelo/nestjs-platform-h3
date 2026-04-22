import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  Param,
  Query,
  Req,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type {
  H3ServerRequest,
  H3ServerResponse,
  NestH3Application,
  PolyfilledResponse,
} from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { fetchAppHandler } from '@marcosvnmelo/testing-shared';

import { AppModule } from '../src/app.module.ts';

describe('Middleware (H3Adapter)', () => {
  let app: NestH3Application;

  describe('should return expected values depending on the route', () => {
    const INCLUDED_VALUE = 'test_included';
    const QUERY_VALUE = 'test_query';
    const REQ_URL_VALUE = 'test_req_url';
    const RETURN_VALUE = 'test';
    const SCOPED_VALUE = 'test_scoped';
    const WILDCARD_VALUE = 'test_wildcard';

    @Controller()
    class TestController {
      @Get('express_style_wildcard/wildcard_nested')
      express_style_wildcard() {
        return RETURN_VALUE;
      }

      @Get('legacy_style_wildcard/wildcard_nested')
      legacy_style_wildcard() {
        return RETURN_VALUE;
      }

      @Get('test')
      test() {
        return RETURN_VALUE;
      }

      @Get('query')
      query() {
        return RETURN_VALUE;
      }

      @Get('tests/wildcard_nested')
      wildcard_nested() {
        return RETURN_VALUE;
      }

      @Get('tests/included')
      included() {
        return RETURN_VALUE;
      }
    }

    @Controller(QUERY_VALUE)
    class TestQueryController {
      @Get()
      queryValue(@Query('test') test: string) {
        return test;
      }
    }

    @Module({
      imports: [AppModule],
      controllers: [TestController, TestQueryController],
    })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(INCLUDED_VALUE),
          )
          .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(REQ_URL_VALUE),
          )
          .forRoutes('req/url/*')
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(WILDCARD_VALUE),
          )
          .forRoutes(
            'express_style_wildcard/*',
            'tests/*path',
            'legacy_style_wildcard/(.*)',
          )
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(QUERY_VALUE),
          )
          .forRoutes('query')
          .apply(
            (
              _req: H3ServerRequest,
              _res: PolyfilledResponse<H3ServerResponse>,
              next: () => void,
            ) => next(),
          )
          .forRoutes(TestQueryController)
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(SCOPED_VALUE),
          )
          .forRoutes(TestController)
          .apply(
            (
              _req: H3ServerRequest,
              res: PolyfilledResponse<H3ServerResponse>,
              _next: () => void,
            ) => res.end(RETURN_VALUE),
          )
          .exclude({ path: QUERY_VALUE, method: -1 as any })
          .forRoutes('*');
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication<NestH3Application>(new H3Adapter());

      await app.init();
    });

    it(`forRoutes(*)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/hello', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(RETURN_VALUE));
    });

    it(`forRoutes(TestController)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/test', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(SCOPED_VALUE));
    });

    it(`query?test=${QUERY_VALUE} forRoutes(query)`, async () => {
      await fetchAppHandler(
        app,
        new Request(`http://localhost:3000/query?test=${QUERY_VALUE}`, {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(QUERY_VALUE));
    });

    it(`${QUERY_VALUE}?test=${QUERY_VALUE} forRoutes(${QUERY_VALUE})`, async () => {
      await fetchAppHandler(
        app,
        new Request(
          `http://localhost:3000/${QUERY_VALUE}?test=${QUERY_VALUE}`,
          {
            method: 'GET',
          },
        ),
      )
        .then((res) => res.text())

        .then((payload) => expect(payload).toEqual(QUERY_VALUE));
    });

    it(`forRoutes(tests/*path)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/tests/wildcard_nested', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(WILDCARD_VALUE));
    });

    it(`forRoutes(express_style_wildcard/*)`, async () => {
      await fetchAppHandler(
        app,
        new Request(
          'http://localhost:3000/express_style_wildcard/wildcard_nested',
          { method: 'GET' },
        ),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(WILDCARD_VALUE));
    });

    it(`forRoutes(legacy_style_wildcard/*)`, async () => {
      await fetchAppHandler(
        app,
        new Request(
          'http://localhost:3000/legacy_style_wildcard/wildcard_nested',
          { method: 'GET' },
        ),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(WILDCARD_VALUE));
    });

    it(`forRoutes(req/url/)`, async () => {
      const reqUrl = '/test';
      await fetchAppHandler(
        app,
        new Request(`http://localhost:3000/req/url${reqUrl}`, {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(REQ_URL_VALUE));
    });

    it(`GET forRoutes(GET tests/included)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/tests/included', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(WILDCARD_VALUE));
    });

    it(`POST forRoutes(POST tests/included)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/tests/included', {
          method: 'POST',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(INCLUDED_VALUE));
    });

    // cspell:word ncluded
    it(`GET forRoutes(POST /tests/%69ncluded) - ensure middleware is executed correctly with encoded characters`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/tests/%69ncluded', {
          method: 'POST',
        }),
      )
        .then((res) => res.text())
        .then((payload) => expect(payload).toEqual(INCLUDED_VALUE));
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should execute middleware only once for given routes', () => {
    class Middleware implements NestMiddleware {
      use(request: any, _reply: any, next: () => void) {
        if (request.middlewareExecutionCount === undefined) {
          request.middlewareExecutionCount = 1;
        } else {
          request.middlewareExecutionCount++;
        }
        next();
      }
    }

    @Controller()
    class AbcController {
      @Get('/a')
      async a(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/a/b')
      async ab(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/a/b/c')
      async abc(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar')
      async withSimilar(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar/test')
      async withSimilarTest(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar/:id')
      async withSimilarId(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      private validateExecutionCount({
        request,
        expected,
      }: {
        request: any;
        expected: number;
      }) {
        let actual: number | undefined;
        actual = request.middlewareExecutionCount;
        actual ??= 0;

        return {
          success: actual === expected,
          actual,
          expected,
        };
      }
    }

    @Module({
      controllers: [AbcController],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(Middleware).forRoutes(AbcController);
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication<NestH3Application>(new H3Adapter());

      await app.init();
    });

    it(`GET forRoutes(/a/b/c)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/a/b/c', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) => {
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          );
        });
    });

    it(`GET forRoutes(/a/b)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/a/b', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/a)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/a', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/similar', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar/test)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/similar/test', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())

        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar/arbitrary)`, async () => {
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/similar/arbitrary', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should have data attached in middleware', () => {
    @Controller()
    class DataController {
      @Get('data')
      async data(@Req() req: H3ServerRequest & { extras: { data: string } }) {
        return {
          success: true,
          extras: req.extras,
          pong: req.headers?.ping,
        };
      }
      @Get('pong')
      async pong(@Req() req: H3ServerRequest) {
        return { success: true, pong: req.headers?.ping };
      }

      @Get('')
      async rootPath(@Req() _req: H3ServerRequest) {
        return { success: true, root: true };
      }

      @Get('record/:id')
      async record(@Req() _req: H3ServerRequest, @Param('id') id: string) {
        return { success: true, record: id };
      }
    }

    @Module({
      controllers: [DataController],
    })
    class DataModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(
            (
              req: H3ServerRequest & { extras: { data: string } },
              res: PolyfilledResponse<H3ServerResponse>,
              next: () => void,
            ) => {
              req.extras = { data: 'Data attached in middleware' };
              req.headers['ping'] = 'pong';

              // When global prefix is set and the route is the root path
              if (req.url === '/api') {
                return res.end(JSON.stringify({ success: true, pong: 'pong' }));
              }
              next();
            },
          )
          .forRoutes('{*path}');
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [DataModule],
        }).compile()
      ).createNestApplication<NestH3Application>(new H3Adapter());
    });

    it(`GET forRoutes('{*path}') with global prefix (route: /api/pong)`, async () => {
      app.setGlobalPrefix('/api');
      await app.init();
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/api/pong', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              pong: 'pong',
            }),
          ),
        );
    });

    it(`GET forRoutes('{*path}') with global prefix (route: /api)`, async () => {
      app.setGlobalPrefix('/api');
      await app.init();
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/api', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              pong: 'pong',
            }),
          ),
        );
    });

    it(`GET forRoutes('{*path}') without prefix config`, async () => {
      await app.init();
      await fetchAppHandler(
        app,
        new Request('http://localhost:3000/pong', {
          method: 'GET',
        }),
      )
        .then((res) => res.text())
        .then((payload) =>
          expect(payload).toEqual(
            JSON.stringify({
              success: true,
              pong: 'pong',
            }),
          ),
        );
    });

    it(`GET forRoutes('{*path}') with global prefix and exclude patterns`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/')
        .expect(200, { success: true, root: true });
    });

    it(`GET forRoutes('{*path}') with global prefix and exclude pattern with wildcard`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/record/{*path}'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/api/pong')
        .expect(200, { success: true, pong: 'pong' });
      await request(app.getHttpServer())
        .get('/record/abc123')
        .expect(200, { success: true, record: 'abc123' });
    });

    it(`GET forRoutes('{*path}') with global prefix and exclude pattern with parameter`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/record/:id'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/record/abc123')
        .expect(200, { success: true, record: 'abc123' });
      await request(app.getHttpServer())
        .get('/api/pong')
        .expect(200, { success: true, pong: 'pong' });
    });

    it(`GET forRoutes('{*path}') with global prefix and global prefix options`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/api/data')
        .expect(200, {
          success: true,
          extras: { data: 'Data attached in middleware' },
          pong: 'pong',
        });
      await request(app.getHttpServer())
        .get('/')
        .expect(200, { success: true, root: true });
    });

    it(`GET forRoutes('{*path}') with global prefix that not starts with /`, async () => {
      app.setGlobalPrefix('api');
      await app.init();

      await request(app.getHttpServer())
        .get('/api/data')
        .expect(200, {
          success: true,
          extras: { data: 'Data attached in middleware' },
          pong: 'pong',
        });
      await request(app.getHttpServer()).get('/').expect(404);
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
