import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import { EventSource } from 'eventsource';
import { H3 } from 'h3';

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
        new H3Adapter(new H3()),
      );

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

    it('receives events from server', () =>
      new Promise<void>((done) => {
        eventSource.addEventListener('message', (event) => {
          expect(JSON.parse(event.data)).toEqual({
            hello: 'world',
          });
          done();
        });
      }));
  });

  describe('with forceCloseConnections', () => {
    beforeEach(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestH3Application>(
        new H3Adapter(new H3()),
        {
          forceCloseConnections: true,
        },
      );

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

    it('receives events from server', () =>
      new Promise<void>((done) => {
        eventSource.addEventListener('message', (event) => {
          expect(JSON.parse(event.data)).toEqual({
            hello: 'world',
          });
          done();
        });
      }));
  });
});
