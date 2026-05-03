import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { BenchmarkModule } from '../app/app.module.ts';
import { commonArgs } from '../constants/args.constants.ts';
import { cpuProfiling } from '../utils/cpu-profiling.utils.ts';
import { parseArgs } from '../utils/parse-args.utils.ts';

const now = Date.now();

const OPTIONS = parseArgs({
  nestBodyParser: commonArgs.nestBodyParser,

  enableUnsafePolyfills: commonArgs.enableUnsafePolyfills,
  enableProfiling: commonArgs.enableProfiling,
  port: commonArgs.port,
  bootstrapProfileOut: commonArgs.bootstrapProfileOut.defaultValue(
    `cpu-profile-${now}.bootstrap.cpuprofile`,
  ),
  profileOut: commonArgs.profileOut.defaultValue(
    `cpu-profile-${now}.server.cpuprofile`,
  ),
});

await bootstrap();

async function bootstrap() {
  const bootstrapCpuProfiler = cpuProfiling();
  if (OPTIONS.enableProfiling.value) {
    await bootstrapCpuProfiler.start();
  }

  const app = await NestFactory.create<NestH3Application>(
    BenchmarkModule,
    new H3Adapter(),
    {
      logger: false,
      bodyParser: OPTIONS.nestBodyParser.value,
    },
  );

  if (OPTIONS.enableUnsafePolyfills.value) {
    app.enableUnsafePolyfills();
  }

  await app.listen(OPTIONS.port.value, '127.0.0.1');

  if (OPTIONS.enableProfiling.value) {
    await bootstrapCpuProfiler.stop(OPTIONS.bootstrapProfileOut.value);
    console.log(
      `Bootstrap profile written: ${OPTIONS.bootstrapProfileOut.value}`,
    );
  }

  const cpuProfiler = cpuProfiling();
  if (OPTIONS.enableProfiling.value) {
    await cpuProfiler.start();
  }

  const server = app.getHttpServer();
  const address = server.address();
  if (typeof address !== 'object' || !address?.port) {
    throw new Error('Server address is not an object or does not have a port');
  }
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Nest H3 server listening: ${url}`);

  process.on('SIGINT', async () => {
    if (OPTIONS.enableProfiling.value) {
      await cpuProfiler.stop(OPTIONS.profileOut.value);
      console.log(`Profile written: ${OPTIONS.profileOut.value}`);
    }
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    if (OPTIONS.enableProfiling.value) {
      await cpuProfiler.stop(OPTIONS.profileOut.value);
      console.log(`Profile written: ${OPTIONS.profileOut.value}`);
    }
    await app.close();
    process.exit(0);
  });
}
