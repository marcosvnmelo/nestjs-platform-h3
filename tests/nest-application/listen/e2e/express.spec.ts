import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import { H3 } from 'h3';

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';
import { allocEphemeralTcpPort } from '@marcosvnmelo/testing-shared';

import { AppModule } from '../src/app.module.ts';

describe('Listen (Express Application)', () => {
  let testModule: TestingModule;
  let app: NestH3Application;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = testModule.createNestApplication(new H3Adapter(new H3()));
  });

  afterEach(async () => {
    await app.close();
  });

  it('should resolve with httpServer on success', async () => {
    const response = await app.listen(0);
    expect(response).toEqual(app.getHttpServer());
  });

  it('should reject if the port is not available', async () => {
    const port = await allocEphemeralTcpPort();
    await app.listen(port);
    const secondApp = testModule.createNestApplication(new H3Adapter(new H3()));
    await expect(secondApp.listen(port)).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
  });

  it('should reject if there is an invalid host', async () => {
    await expect(app.listen(0, '1')).rejects.toMatchObject({
      code: 'EADDRNOTAVAIL',
    });
  });
});
