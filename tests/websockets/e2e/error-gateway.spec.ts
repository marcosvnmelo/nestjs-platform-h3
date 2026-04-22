import { afterEach, beforeEach, describe, expect, it } from '@rstest/core';
import { io } from 'socket.io-client';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { ErrorGateway } from '../src/error.gateway.js';

describe('ErrorGateway', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      providers: [ErrorGateway],
    }).compile();

    app = testingModule.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );
    await app.listen(0);
  });

  it(`should handle error`, async () => {
    const ws = io('http://localhost:8080');
    const pattern = 'push';
    const data = { test: 'test' };

    ws.emit(pattern, data);

    await new Promise<void>((resolve) =>
      ws.on('exception', (error) => {
        expect(error).toEqual({
          status: 'error',
          message: 'test',
          cause: {
            pattern,
            data,
          },
        });
        resolve();
      }),
    );
  });

  afterEach(() => app.close());
});
