// cspell:ignore mbps mbit
import 'reflect-metadata';

import fs from 'node:fs/promises';
import { Session } from 'node:inspector/promises';
import type { AddressInfo } from 'node:net';

import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

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

function parseStringArg(name: string, defaultValue: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }
  const raw = value.slice(prefix.length);
  if (!raw) {
    throw new Error(`Empty value for --${name}`);
  }
  return raw;
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
