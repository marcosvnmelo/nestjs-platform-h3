// cspell:ignore mbps mbit
import 'reflect-metadata';

import fs from 'node:fs/promises';
import { Session } from 'node:inspector/promises';
import type { AddressInfo } from 'node:net';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { BenchmarkModule } from '../app/app.module.ts';
import { parseBooleanArg, parseStringArg } from '../utils/parse-args.utils.ts';

function cpuProfiling() {
  let session: Session | undefined;

  return {
    start: async () => {
      session = new Session();
      session.connect();

      await session.post('Profiler.enable');
      await session.post('Profiler.start');
    },
    stop: async (outPath: string) => {
      if (!session) {
        console.warn('No session to stop');
        return;
      }

      const { profile } = await session.post('Profiler.stop');

      await fs.writeFile(outPath, JSON.stringify(profile, null, 2));

      session.disconnect();
    },
  };
}

const now = Date.now();

const OPTIONS = {
  nestBodyParser: parseBooleanArg('nest-body-parser', true),
  bootstrapProfileOut: parseStringArg(
    'bootstrap-profile-out',
    `cpu-profile-${now}.bootstrap.cpuprofile`,
  ),
  profileOut: parseStringArg(
    'profile-out',
    `cpu-profile-${now}.server.cpuprofile`,
  ),
  enableUnsafePolyfills: parseBooleanArg('enable-unsafe-polyfills', false),
};

await bootstrapAndProfile();

async function bootstrapAndProfile() {
  const bootstrapCpuProfiler = cpuProfiling();
  await bootstrapCpuProfiler.start();

  const app = await NestFactory.create<NestH3Application>(
    BenchmarkModule,
    new H3Adapter(),
    {
      logger: false,
      bodyParser: OPTIONS.nestBodyParser,
    },
  );

  await app.listen(0, '127.0.0.1');

  if (OPTIONS.enableUnsafePolyfills) {
    app.enableUnsafePolyfills();
  }

  await bootstrapCpuProfiler.stop(OPTIONS.bootstrapProfileOut);

  const cpuProfiler = cpuProfiling();
  await cpuProfiler.start();

  const server = app.getHttpServer();
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Bootstrap profile written: ${OPTIONS.bootstrapProfileOut}`);
  console.log(`Nest H3 server listening: ${url} (hit /hello)`);
  console.log(
    'Stop with Ctrl+C, or load-test from other process via profiling-load.',
  );

  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => resolve());
    process.once('SIGTERM', () => resolve());
  });

  await app.close();
  await cpuProfiler.stop(OPTIONS.profileOut);
  console.log(`Profile written: ${OPTIONS.profileOut}`);
}
