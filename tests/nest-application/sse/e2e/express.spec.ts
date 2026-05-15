import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import { EventSource } from 'eventsource';

import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

describe('Sse (Express Application)', () => {
  let app: NestH3Application;
  let eventSource: EventSource;

  describe('without forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestH3Application>(
        new H3Adapter(),
      );
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(0);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              connection: 'keep-alive',
            },
          }),
      });
    });

    // The order of actions is very important here. When not using `forceCloseConnections`,
    // the SSe eventsource should close the connections in order to signal the server that
    // the keep-alive connection can be ended.
    afterEach(async () => {
      eventSource.close();

      await app.close();
    });

    it('receives events from server', async () => {
      await new Promise<void>((done) => {
        eventSource.addEventListener('message', (event) => {
          expect(JSON.parse(event.data)).to.eql({
            hello: 'world',
          });
          done();
        });
      });
    });

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).to.equal(400);
      expect(response.headers.get('content-type')).to.contain(
        'application/json',
      );
    });
  });

  describe('with forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestH3Application>(
        new H3Adapter(),
        {
          forceCloseConnections: true,
        },
      );
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      await app.listen(0);
      const url = await app.getUrl();

      eventSource = new EventSource(url + '/sse', {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            headers: {
              ...init?.headers,
              connection: 'keep-alive',
            },
          }),
      });
    });

    afterEach(async () => {
      await app.close();

      eventSource.close();
    });

    it('receives events from server', async () => {
      await new Promise<void>((done) => {
        eventSource.addEventListener('message', (event) => {
          expect(JSON.parse(event.data)).to.eql({
            hello: 'world',
          });
          done();
        });
      });
    });

    it('returns a validation error status before opening the SSE stream', async () => {
      const response = await fetch(
        `${await app.getUrl()}/sse/validated?limit=invalid`,
        {
          headers: {
            accept: 'text/event-stream',
          },
        },
      );

      expect(response.status).to.equal(400);
      expect(response.headers.get('content-type')).to.contain(
        'application/json',
      );
    });
  });

  describe('backpressure', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestH3Application>(
        new H3Adapter(),
        {
          forceCloseConnections: true,
        },
      );

      await app.listen(0);
    });

    afterEach(async () => {
      await app.close();
    });

    it('should deliver all events when bursting large payloads', async () => {
      const url = await app.getUrl();
      const n = 50;
      const size = 65536;

      const response = await fetch(`${url}/sse/burst?n=${n}&size=${size}`);
      const body = await response.text();

      const dataLines = body
        .split('\n')
        .filter((line) => line.startsWith('data: '));

      expect(dataLines).to.have.lengthOf(n);
    });
  });
});
