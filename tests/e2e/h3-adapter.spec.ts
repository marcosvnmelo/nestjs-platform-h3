import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module';

describe('Hello world (H3 adapter)', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Basic GET routes', () => {
    it('/GET should return "Hello world!"', async () => {
      await request(server).get('/hello').expect(200).expect('Hello world!');
    });

    it('/GET should attach response header', async () => {
      await request(server)
        .get('/hello')
        .expect(200)
        .expect('Authorization', 'Bearer');
    });

    it('/GET (Promise/async) returns "Hello world!"', async () => {
      await request(server)
        .get('/hello/async')
        .expect(200)
        .expect('Hello world!');
    });

    it('/GET (Observable stream) returns "Hello world!"', async () => {
      await request(server)
        .get('/hello/stream')
        .expect(200)
        .expect('Hello world!');
    });
  });

  describe('@Param() decorator', () => {
    it('should extract route parameter', async () => {
      await request(server)
        .get('/hello/param/123')
        .expect(200)
        .expect({ id: '123' });
    });

    it('should handle different parameter values', async () => {
      await request(server)
        .get('/hello/param/abc-def')
        .expect(200)
        .expect({ id: 'abc-def' });
    });
  });

  describe('@Query() decorator', () => {
    it('should extract single query parameter', async () => {
      await request(server)
        .get('/hello/query?name=John')
        .expect(200)
        .expect({ name: 'John' });
    });

    it('should extract full query object', async () => {
      await request(server)
        .get('/hello/full-query?name=John&age=30&active=true')
        .expect(200)
        .expect({ name: 'John', age: '30', active: 'true' });
    });
  });

  describe('@Body() decorator', () => {
    it('should parse JSON body in POST request', async () => {
      const body = { name: 'John', email: 'john@example.com' };
      await request(server)
        .post('/hello/body')
        .send(body)
        .expect(201)
        .expect(body);
    });

    it('should parse JSON body in PUT request with params', async () => {
      const body = { name: 'Jane', email: 'jane@example.com' };
      await request(server)
        .put('/hello/body/456')
        .send(body)
        .expect(200)
        .expect({ id: '456', body });
    });
  });

  describe('@Req() and @Res() decorators', () => {
    it('should provide access to request object via @Req()', async () => {
      await request(server)
        .get('/hello/req')
        .expect(200)
        .expect((res) => {
          expect(res.body.method).toBe('GET');
          expect(res.body.url).toContain('/hello/req');
        });
    });

    it('should allow response control via @Res()', async () => {
      await request(server)
        .get('/hello/res')
        .expect(200)
        .expect('Response from @Res()');
    });

    it('should support @Res({ passthrough: true })', async () => {
      await request(server)
        .get('/hello/res-passthrough')
        .expect(200)
        .expect('X-Custom-Header', 'custom-value')
        .expect({ passthrough: true });
    });

    it('should expose H3Event on request', async () => {
      await request(server)
        .get('/hello/h3-event')
        .expect(200)
        .expect({ hasH3Event: true });
    });
  });

  describe('Local pipes', () => {
    it('should execute locally injected pipe', async () => {
      await request(server)
        .get('/hello/local-pipe/1')
        .expect(200)
        .expect({ id: '1' });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(server).get('/unknown-route').expect(404);
    });
  });
});
