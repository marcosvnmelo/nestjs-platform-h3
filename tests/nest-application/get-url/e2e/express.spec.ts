import { beforeEach, describe, expect, it } from '@rstest/core';
import { H3 } from 'h3';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';
import { getAvailableIpv4Host, randomPort } from './utils.js';

describe('Get URL (Express Application)', () => {
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

  it('should be able to get the IPv6 address', async () => {
    const app = testModule.createNestApplication(new H3Adapter(new H3()));
    await app.listen(port);
    expect(await app.getUrl()).to.be.eql(`http://[::1]:${port}`);
    await app.close();
  });
  it('should be able to get the IPv4 address', async () => {
    const app = testModule.createNestApplication(new H3Adapter(new H3()));
    const host = await getAvailableIpv4Host();
    await app.listen(port, host);
    expect(await app.getUrl()).to.be.eql(`http://${host}:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 for 0.0.0.0', async () => {
    const app = testModule.createNestApplication(new H3Adapter(new H3()));
    await app.listen(port, '0.0.0.0');
    expect(await app.getUrl()).to.be.eql(`http://127.0.0.1:${port}`);
    await app.close();
  });
  it('should return 127.0.0.1 even in a callback', () => {
    const app = testModule.createNestApplication(new H3Adapter(new H3()));
    return app.listen(port, async () => {
      expect(await app.getUrl()).to.be.eql(`http://127.0.0.1:${port}`);
      await app.close();
    });
  });
  it('should throw an error for calling getUrl before listen', async () => {
    const app = testModule.createNestApplication(new H3Adapter(new H3()));
    try {
      await app.getUrl();
    } catch (err) {
      expect(err).to.be.eql(
        'app.listen() needs to be called before calling app.getUrl()',
      );
    }
  });
});
