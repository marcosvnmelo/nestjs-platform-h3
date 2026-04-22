import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';
import {
  getHttpBaseOptions,
  sendCanceledHttpRequest,
  sendHttpRequest,
} from './utils.ts';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

describe('Express FileSend', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication(new H3Adapter());
    await app.init();
  });

  it('should return a file from a stream', async () => {
    await request(app.getHttpServer())
      .get('/file/stream/')
      .expect(200)
      .expect((res) => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    await request(app.getHttpServer())
      .get('/file/buffer')
      .expect(200)
      .expect((res) => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should not stream a non-file', async () => {
    await request(app.getHttpServer())
      .get('/non-file/pipe-method')
      .expect(200)
      .expect({ value: 'Hello world' });
  });
  it('should return a file from an RxJS stream', async () => {
    await request(app.getHttpServer())
      .get('/file/rxjs/stream/')
      .expect(200)
      .expect((res) => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should return a file with correct headers', async () => {
    await request(app.getHttpServer())
      .get('/file/with/headers')
      .expect(200)
      .expect('Content-Type', 'text/markdown')
      .expect('Content-Disposition', 'attachment; filename="Readme.md"')
      .expect('Content-Length', readme.byteLength.toString())
      .expect((res) => {
        expect(res.text).toBe(readmeString);
      });
  });
  it('should return an error if the file does not exist', async () => {
    await request(app.getHttpServer()).get('/file/not/exist').expect(400);
  });
  // TODO: temporarily turned off (flaky test)
  it.skip('should allow for the client to end the response and be able to make another', async () => {
    await app.listen(0);
    const url = await getHttpBaseOptions(app);
    await sendCanceledHttpRequest(new URL('/file/slow', url));
    const res = await sendHttpRequest(new URL('/file/stream', url));
    expect(res.statusCode).toBe(200);
  });
});
