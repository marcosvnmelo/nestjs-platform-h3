import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { wrapH3App } from '@marcosvnmelo/testing-shared';

import { AppModule } from '../src/app.module.ts';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

describe('Fastify FileSend', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  it('should return a file from a stream', async () => {
    await wrapH3App(app)
      .inject({
        method: 'GET',
        url: '/file/stream',
      })
      .then(({ payload }) => {
        expect(payload.toString()).to.be.eq(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    await wrapH3App(app)
      .inject({
        method: 'GET',
        url: '/file/buffer',
      })
      .then(({ payload }) => {
        expect(payload.toString()).to.be.eq(readmeString);
      });
  });
  /**
   * It seems that Fastify has a similar issue as Kamil initially pointed out
   * If a class has a `pipe` method, it will be treated as a stream. This means
   * that the `NonFile` test is a failed case for fastify, hence the skip.
   */
  it.skip('should not stream a non-file', async () => {
    await wrapH3App(app)
      .inject({
        url: '/non-file/pipe-method',
        method: 'get',
      })
      .then(({ payload }) => {
        expect(payload).to.be.eq({ value: 'Hello world' });
      });
  });
  it('should return a file from an RxJS stream', async () => {
    await wrapH3App(app)
      .inject({
        method: 'GET',
        url: '/file/rxjs/stream',
      })
      .then(({ payload }) => {
        expect(payload.toString()).to.be.eq(readmeString);
      });
  });
  it('should return a file with correct headers', async () => {
    await wrapH3App(app)
      .inject({ url: '/file/with/headers', method: 'get' })
      .then(({ statusCode, headers, payload }) => {
        expect(statusCode).to.equal(200);
        expect(headers['content-type']).to.equal('text/markdown');
        expect(headers['content-disposition']).to.equal(
          'attachment; filename="Readme.md"',
        );
        expect(headers['content-length']).to.equal(`${readme.byteLength}`);
        expect(payload).to.equal(readmeString);
      });
  });
});
