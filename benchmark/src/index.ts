import 'reflect-metadata';

import { createServer } from 'node:http';
import type { Result } from 'autocannon';
import type { AddressInfo } from 'node:net';
import autocannon from 'autocannon';
import express from 'express';
import fastify from 'fastify';
import { H3 } from 'h3';
import { toNodeHandler } from 'h3/node';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

interface Closable {
  url: string;
  close: () => Promise<void>;
}

interface BenchmarkCase {
  name: string;
  start: () => Promise<Closable>;
}

interface BenchmarkStats {
  name: string;
  requestsPerSec: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  throughputMbps: number;
  errors: number;
  timeouts: number;
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

const BENCHMARK_OPTIONS = {
  duration: parseIntegerArg('duration', 10),
  connections: parseIntegerArg('connections', 100),
  pipelining: parseIntegerArg('pipelining', 1),
  warmupSeconds: parseIntegerArg('warmup', 2),
};

const cases: BenchmarkCase[] = [
  {
    name: 'Pure Express',
    start: async () => {
      const app = express();
      app.get('/hello', (_req, res) => {
        res.send('ok');
      });

      const server = app.listen(0, '127.0.0.1');
      await waitForListen(server);

      const address = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: () => closeHttpServer(server),
      };
    },
  },
  {
    name: 'Nest Express',
    start: async () => {
      const app = await NestFactory.create(
        BenchmarkModule,
        new ExpressAdapter(),
        { logger: false },
      );

      await app.listen(0, '127.0.0.1');

      const server = app.getHttpServer();
      const address = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
          await app.close();
        },
      };
    },
  },
  {
    name: 'Pure Fastify',
    start: async () => {
      const app = fastify({ logger: false });
      app.get('/hello', async () => 'ok');
      await app.listen({ port: 0, host: '127.0.0.1' });

      const address = app.server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
          await app.close();
        },
      };
    },
  },
  {
    name: 'Nest Fastify',
    start: async () => {
      const app = await NestFactory.create<NestFastifyApplication>(
        BenchmarkModule,
        new FastifyAdapter(),
        { logger: false },
      );
      await app.listen(0, '127.0.0.1');

      const server = app.getHttpServer();
      const address = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
          await app.close();
        },
      };
    },
  },
  {
    name: 'Pure H3',
    start: async () => {
      const app = new H3();
      app.get('/hello', () => 'ok');

      const server = createServer(toNodeHandler(app));
      server.listen(0, '127.0.0.1');
      await waitForListen(server);

      const address = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: () => closeHttpServer(server),
      };
    },
  },
  {
    name: 'Nest H3 Adapter',
    start: async () => {
      const app = await NestFactory.create<NestH3Application>(
        BenchmarkModule,
        new H3Adapter(),
        { logger: false },
      );

      await app.listen(0, '127.0.0.1');

      const server = app.getHttpServer();
      const address = server.address() as AddressInfo;
      return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
          await app.close();
        },
      };
    },
  },
];

await run();

async function run() {
  const results: BenchmarkStats[] = [];

  console.log(
    [
      'Running benchmark with autocannon',
      `duration=${BENCHMARK_OPTIONS.duration}s`,
      `connections=${BENCHMARK_OPTIONS.connections}`,
      `pipelining=${BENCHMARK_OPTIONS.pipelining}`,
      `warmup=${BENCHMARK_OPTIONS.warmupSeconds}s`,
    ].join(' | '),
  );

  for (const benchCase of cases) {
    console.log(`\n→ ${benchCase.name}`);
    const target = await benchCase.start();

    try {
      await runAutocannon(`${target.url}/hello`, {
        duration: BENCHMARK_OPTIONS.warmupSeconds,
        connections: Math.max(1, Math.floor(BENCHMARK_OPTIONS.connections / 2)),
        pipelining: BENCHMARK_OPTIONS.pipelining,
      });

      const result = await runAutocannon(`${target.url}/hello`, {
        duration: BENCHMARK_OPTIONS.duration,
        connections: BENCHMARK_OPTIONS.connections,
        pipelining: BENCHMARK_OPTIONS.pipelining,
      });

      results.push(toStats(benchCase.name, result));
    } finally {
      await target.close();
    }
  }

  console.log('\nRaw results');
  console.table(
    results.map((entry) => ({
      'name': entry.name,
      'req/s': entry.requestsPerSec.toFixed(2),
      'lat(avg) ms': entry.latencyAvgMs.toFixed(2),
      'lat(p99) ms': entry.latencyP99Ms.toFixed(2),
      'mbit/s': entry.throughputMbps.toFixed(2),
      'errors': entry.errors,
      'timeouts': entry.timeouts,
    })),
  );

  printPairComparison(results, 'Pure Express', 'Nest Express');
  printPairComparison(results, 'Pure Fastify', 'Nest Fastify');
  printPairComparison(results, 'Pure H3', 'Nest H3 Adapter');
}

function printPairComparison(
  results: BenchmarkStats[],
  pureName: string,
  nestName: string,
) {
  const pure = results.find((item) => item.name === pureName);
  const nest = results.find((item) => item.name === nestName);

  if (!pure || !nest) {
    return;
  }

  const delta =
    ((nest.requestsPerSec - pure.requestsPerSec) / pure.requestsPerSec) * 100;
  const sign = delta >= 0 ? '+' : '';

  console.log(`\n${pureName} vs ${nestName}`);
  console.log(
    `- req/s: ${pure.requestsPerSec.toFixed(2)} vs ${nest.requestsPerSec.toFixed(2)}`,
  );
  console.log(`- delta: ${sign}${delta.toFixed(2)}%`);
}

function toStats(name: string, result: Result): BenchmarkStats {
  return {
    name,
    requestsPerSec: result.requests.average,
    latencyAvgMs: result.latency.average,
    latencyP99Ms: result.latency.p99,
    throughputMbps: (result.throughput.average * 8) / (1024 * 1024),
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

function runAutocannon(
  url: string,
  options: {
    duration: number;
    connections: number;
    pipelining: number;
  },
): Promise<Result> {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        duration: options.duration,
        connections: options.connections,
        pipelining: options.pipelining,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
  });
}

function waitForListen(server: { once: Function; listening: boolean }) {
  if (server.listening) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', (error: unknown) => reject(error));
  });
}

function closeHttpServer(server: { close: Function }) {
  return new Promise<void>((resolve, reject) => {
    server.close((error: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function parseIntegerArg(name: string, defaultValue: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid value for --${name}: ${value.slice(prefix.length)}`,
    );
  }

  return parsed;
}
