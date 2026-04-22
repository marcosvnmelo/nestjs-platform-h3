import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { fetchAppHandler } from '@marcosvnmelo/testing-shared';

import { AppModule } from '../src/app.module.ts';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

describe('Fastify FileSend', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication(new H3Adapter());
    await app.init();
  });

  it('should return a file from a stream', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/file/stream', {
        method: 'GET',
      }),
    ).then(async (res) => {
      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe(readmeString);
    });
  });
  it('should return a file from a buffer', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/file/buffer', {
        method: 'GET',
      }),
    ).then((res) => {
      expect(res.status).toBe(200);
      expect(res.text()).resolves.toBe(readmeString);
    });
  });
  /**
   * It seems that Fastify has a similar issue as Kamil initially pointed out
   * If a class has a `pipe` method, it will be treated as a stream. This means
   * that the `NonFile` test is a failed case for fastify, hence the skip.
   */
  it.skip('should not stream a non-file', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/non-file/pipe-method', {
        method: 'GET',
      }),
    ).then(async (res) => {
      await expect(res.json()).resolves.toBe({ value: 'Hello world' });
    });
  });
  it('should return a file from an RxJS stream', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/file/rxjs/stream', {
        method: 'GET',
      }),
    ).then(async (res) => {
      expect(res.status).toBe(200);
      await expect(res.text()).resolves.toBe(readmeString);
    });
  });
  it('should return a file with correct headers', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/file/with/headers', {
        method: 'GET',
      }),
    ).then(async (res) => {
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/markdown');
      expect(res.headers.get('content-disposition')).toBe(
        'attachment; filename="Readme.md"',
      );
      expect(res.headers.get('content-length')).toBe(`${readme.byteLength}`);
      await expect(res.text()).resolves.toBe(readmeString);
    });
  });
  it('should return an error if the file does not exist', async () => {
    await fetchAppHandler(
      app,
      new Request('http://localhost:3000/file/not/exist', {
        method: 'GET',
      }),
    ).then((res) => {
      expect(res.status).toBe(400);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
