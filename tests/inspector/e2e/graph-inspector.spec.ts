import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it, rs } from '@rstest/core';

import type { MicroserviceOptions } from '@nestjs/microservices';
import type { TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { Injector } from '@nestjs/core/injector/injector.js';
import { SerializedGraph } from '@nestjs/core/inspector/serialized-graph.js';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.ts';
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor.ts';

describe('Graph inspector', () => {
  let testingModule: TestingModule;

  beforeAll(async () => {
    rs.spyOn(Injector.prototype as any, 'getNowTimestamp').mockImplementation(
      () => 0,
    );

    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile({ snapshot: true });
  });

  it('should generate a pre-initialization graph and match snapshot', async () => {
    const graph = testingModule.get(SerializedGraph);

    // Update snapshot:
    // writeFileSync(
    //   join(import.meta.dirname, 'fixtures', 'pre-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(import.meta.dirname, 'fixtures', 'pre-init-graph.json'),
      'utf-8',
    );

    expect(JSON.parse(graph.toString())).toEqual(JSON.parse(snapshot));
  });

  it('should generate a post-initialization graph and match snapshot', async () => {
    const app = testingModule.createNestApplication<NestH3Application>(
      new H3Adapter(),
      { preview: true },
    );
    app.useGlobalPipes(new ValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TimeoutInterceptor());
    app.enableVersioning();
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {},
    });
    await app.init();

    const graph = testingModule.get(SerializedGraph);

    // Update snapshot:
    // writeFileSync(
    //   join(import.meta.dirname, 'fixtures', 'post-init-graph.json'),
    //   graph.toString(),
    // );

    const snapshot = readFileSync(
      join(import.meta.dirname, 'fixtures', 'post-init-graph.json'),
      'utf-8',
    );

    expect(JSON.parse(graph.toString())).toEqual(JSON.parse(snapshot));
  });
});
