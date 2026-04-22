import { beforeEach, describe, expect, it } from '@rstest/core';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';
import { randomPort } from './utils.js';

describe('Get URL (Fastify Application)', () => {
  let testModule: TestingModule;
  let port: number;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  beforeEach(async () => {
    port = await randomPort();
  });

  it('should be able to get the IPv4 address', async () => {
    const app = testModule.createNestApplication(new H3Adapter());
    await app.listen(port, '127.0.0.1');
    expect(await app.getUrl()).toEqual(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 for 0.0.0.0', async () => {
    const app = testModule.createNestApplication(new H3Adapter());
    await app.listen(port, '0.0.0.0');
    expect(await app.getUrl()).toEqual(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return a loopback address in a callback (default bind)', async () => {
    const app = testModule.createNestApplication(new H3Adapter());
    return app.listen(port, async () => {
      expect(await app.getUrl()).toMatch(
        new RegExp(`http://(\\[::1\\]|127\\.0\\.0\\.1):${port}`),
      );
      await app.close();
    });
  });
  it('should throw an error for calling getUrl before listen', async () => {
    const app = testModule.createNestApplication(new H3Adapter());
    await expect(app.getUrl()).rejects.toEqual(
      'app.listen() needs to be called before calling app.getUrl()',
    );
  });
});
