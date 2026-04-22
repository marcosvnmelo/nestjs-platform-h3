import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import request from 'supertest';

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { HelloModule } from '../src/inject-inquirer/hello.module.ts';

describe('Inject Inquirer', () => {
  let logger: Record<string, any>;
  let server: any;
  let app: NestH3Application;

  beforeEach(async () => {
    logger = { log: rs.fn() };

    const module = await Test.createTestingModule({
      imports: [HelloModule],
    })
      .overrideProvider(Logger)
      .useValue(logger)
      .compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  it(`should allow the injection of inquirer in a Transient Scope`, async () => {
    await request(server).get('/hello/transient');

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello transient!',
        feature: 'transient',
      }),
    );
  });

  it(`should allow the injection of the inquirer in a Request Scope`, async () => {
    await request(server).get('/hello/request');

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello request!',
        feature: 'request',
      }),
    );

    const requestId = logger.log.mock.calls[0][0].requestId;

    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Goodbye request!',
        requestId,
        feature: 'request',
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
