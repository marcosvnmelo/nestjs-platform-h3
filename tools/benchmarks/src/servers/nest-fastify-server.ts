import 'reflect-metadata';

import type { AddressInfo } from 'node:net';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { BenchmarkModule } from '../app/app.module.ts';
import { parseBooleanArg } from '../utils/parse-args.utils.ts';

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
