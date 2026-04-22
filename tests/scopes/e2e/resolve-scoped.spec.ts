import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { loggerProvider } from '../src/resolve-scoped/logger.provider.js';
import { LoggerService } from '../src/resolve-scoped/logger.service.ts';
import { RequestLoggerService } from '../src/resolve-scoped/request-logger.service.ts';

describe('Resolve method', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService, loggerProvider, RequestLoggerService],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  it('should resolve transient logger', async () => {
    const transientLogger = await app.resolve(LoggerService);
    expect(transientLogger.logger).toEqual({
      logger: true,
    });
  });

  it('should resolve request-scoped logger', async () => {
    const requestScoped = await app.resolve(RequestLoggerService);

    expect(requestScoped.loggerService).toBeInstanceOf(LoggerService);
    expect(requestScoped.loggerService.logger).toEqual({
      logger: true,
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
