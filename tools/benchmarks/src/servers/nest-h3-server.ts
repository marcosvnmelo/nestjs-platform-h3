import 'reflect-metadata';

import type { AddressInfo } from 'node:net';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { BenchmarkModule } from '../app/app.module.ts';
import { parseBooleanArg } from '../utils/parse-args.utils.ts';

const OPTIONS = {
  nestBodyParser: parseBooleanArg('nest-body-parser', true),
  enableUnsafePolyfills: parseBooleanArg('enable-unsafe-polyfills', false),
};

await bootstrap();

async function bootstrap() {
  const app = await NestFactory.create<NestH3Application>(
    BenchmarkModule,
    new H3Adapter(),
    {
      logger: false,
      bodyParser: OPTIONS.nestBodyParser,
    },
  );

  if (OPTIONS.enableUnsafePolyfills) {
    app.enableUnsafePolyfills();
  }

  await app.listen(0, '127.0.0.1');

  const server = app.getHttpServer();
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Nest H3 server listening: ${url}`);

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}
