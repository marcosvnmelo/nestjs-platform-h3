import 'reflect-metadata';

import type { AddressInfo } from 'node:net';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';

class BenchmarkController {
  hello() {
    return 'ok';
  }
}

class BenchmarkModule {}

Controller()(BenchmarkController);
Get('hello')(
  BenchmarkController.prototype,
  'hello',
  Object.getOwnPropertyDescriptor(BenchmarkController.prototype, 'hello')!,
);

Module({
  controllers: [BenchmarkController],
})(BenchmarkModule);

const nestBodyParser = parseBooleanArg('nest-body-parser', true);

await bootstrap();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    BenchmarkModule,
    new FastifyAdapter(),
    {
      logger: false,
      bodyParser: nestBodyParser,
    },
  );
  await app.listen(0, '127.0.0.1');

  const server = app.getHttpServer();
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Nest Fastify server listening: ${url}`);

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}

function parseBooleanArg(name: string, defaultValue: boolean): boolean {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }

  const raw = value.slice(prefix.length).toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') {
    return true;
  }
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') {
    return false;
  }

  throw new Error(`Invalid value for --${name}: ${value.slice(prefix.length)}`);
}
