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
  run: number;
  requestsPerSec: number;
  latencyAvgMs: number;
  latencyP99Ms: number;
  throughputMbps: number;
  errors: number;
  timeouts: number;
}

interface BenchmarkAggregate {
  name: string;
  runs: number;
  requestsPerSecMedian: number;
  requestsPerSecP25: number;
  requestsPerSecP75: number;
  latencyAvgMedianMs: number;
  latencyP99MedianMs: number;
  throughputMedianMbps: number;
  totalErrors: number;
  totalTimeouts: number;
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
  runs: parseIntegerArg('runs', 5),
  nestBodyParser: parseBooleanArg('nest-body-parser', true),
};

const cases: BenchmarkCase[] = [
  {
    name: 'Pure Express',
    start: async () => {
      const app = express();
      if (BENCHMARK_OPTIONS.nestBodyParser) {
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
      }
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
        {
          logger: false,
          bodyParser: BENCHMARK_OPTIONS.nestBodyParser,
        },
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
      app.get('/hello', () => 'ok');
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
        {
          logger: false,
          bodyParser: BENCHMARK_OPTIONS.nestBodyParser,
        },
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
        {
          logger: false,
          bodyParser: BENCHMARK_OPTIONS.nestBodyParser,
        },
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
      `runs=${BENCHMARK_OPTIONS.runs}`,
      `nestBodyParser=${BENCHMARK_OPTIONS.nestBodyParser}`,
    ].join(' | '),
  );

  for (let runIndex = 1; runIndex <= BENCHMARK_OPTIONS.runs; runIndex++) {
    console.log(`\n=== Run ${runIndex}/${BENCHMARK_OPTIONS.runs} ===`);
    const runCases = shuffleCases(cases);
    console.log(`Order: ${runCases.map((entry) => entry.name).join(' -> ')}`);

    for (const benchCase of runCases) {
      console.log(`\n→ ${benchCase.name}`);
      const target = await benchCase.start();

      try {
        await runAutocannon(`${target.url}/hello`, {
          duration: BENCHMARK_OPTIONS.warmupSeconds,
          connections: BENCHMARK_OPTIONS.connections,
          pipelining: BENCHMARK_OPTIONS.pipelining,
        });

        const result = await runAutocannon(`${target.url}/hello`, {
          duration: BENCHMARK_OPTIONS.duration,
          connections: BENCHMARK_OPTIONS.connections,
          pipelining: BENCHMARK_OPTIONS.pipelining,
        });

        const stats = toStats(benchCase.name, result, runIndex);
        results.push(stats);
        printRunStats(stats);
      } finally {
        await target.close();
      }
    }
  }

  console.log('\nRaw per-run results');
  console.table(
    results.map((entry) => ({
      'run': entry.run,
      'name': entry.name,
      'req/s': entry.requestsPerSec.toFixed(2),
      'lat(avg) ms': entry.latencyAvgMs.toFixed(2),
      'lat(p99) ms': entry.latencyP99Ms.toFixed(2),
      'mbit/s': entry.throughputMbps.toFixed(2),
      'errors': entry.errors,
      'timeouts': entry.timeouts,
    })),
  );

  const aggregates = aggregateResults(results);

  console.log('\nAggregated results (median with req/s spread)');
  console.table(
    aggregates.map((entry) => ({
      'name': entry.name,
      'runs': entry.runs,
      'req/s median': entry.requestsPerSecMedian.toFixed(2),
      'req/s p25': entry.requestsPerSecP25.toFixed(2),
      'req/s p75': entry.requestsPerSecP75.toFixed(2),
      'lat(avg) median ms': entry.latencyAvgMedianMs.toFixed(2),
      'lat(p99) median ms': entry.latencyP99MedianMs.toFixed(2),
      'mbit/s median': entry.throughputMedianMbps.toFixed(2),
      'errors(total)': entry.totalErrors,
      'timeouts(total)': entry.totalTimeouts,
    })),
  );

  printPairComparison(aggregates, 'Pure Express', 'Nest Express');
  printPairComparison(aggregates, 'Pure Fastify', 'Nest Fastify');
  printPairComparison(aggregates, 'Pure H3', 'Nest H3 Adapter');
}

function printPairComparison(
  results: BenchmarkAggregate[],
  pureName: string,
  nestName: string,
) {
  const pure = results.find((item) => item.name === pureName);
  const nest = results.find((item) => item.name === nestName);

  if (!pure || !nest) {
    return;
  }

  const delta =
    ((nest.requestsPerSecMedian - pure.requestsPerSecMedian) /
      pure.requestsPerSecMedian) *
    100;
  const sign = delta >= 0 ? '+' : '';

  console.log(`\n${pureName} vs ${nestName}`);
  console.log(
    `- req/s median: ${pure.requestsPerSecMedian.toFixed(2)} vs ${nest.requestsPerSecMedian.toFixed(2)}`,
  );
  console.log(`- delta: ${sign}${delta.toFixed(2)}%`);
}

function toStats(name: string, result: Result, run: number): BenchmarkStats {
  return {
    name,
    run,
    requestsPerSec: result.requests.average,
    latencyAvgMs: result.latency.average,
    latencyP99Ms: result.latency.p99,
    throughputMbps: (result.throughput.average * 8) / (1024 * 1024),
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

function printRunStats(stats: BenchmarkStats) {
  console.log(
    [
      `run=${stats.run}`,
      `req/s=${stats.requestsPerSec.toFixed(2)}`,
      `lat(avg)=${stats.latencyAvgMs.toFixed(2)}ms`,
      `lat(p99)=${stats.latencyP99Ms.toFixed(2)}ms`,
      `errors=${stats.errors}`,
      `timeouts=${stats.timeouts}`,
    ].join(' | '),
  );
}

function shuffleCases(entries: BenchmarkCase[]): BenchmarkCase[] {
  const shuffled = [...entries];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function aggregateResults(results: BenchmarkStats[]): BenchmarkAggregate[] {
  const grouped = new Map<string, BenchmarkStats[]>();
  for (const result of results) {
    const entries = grouped.get(result.name);
    if (entries) {
      entries.push(result);
    } else {
      grouped.set(result.name, [result]);
    }
  }

  return [...grouped.entries()]
    .map(([name, entries]) => ({
      name,
      runs: entries.length,
      requestsPerSecMedian: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.5,
      ),
      requestsPerSecP25: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.25,
      ),
      requestsPerSecP75: percentile(
        entries.map((entry) => entry.requestsPerSec),
        0.75,
      ),
      latencyAvgMedianMs: percentile(
        entries.map((entry) => entry.latencyAvgMs),
        0.5,
      ),
      latencyP99MedianMs: percentile(
        entries.map((entry) => entry.latencyP99Ms),
        0.5,
      ),
      throughputMedianMbps: percentile(
        entries.map((entry) => entry.throughputMbps),
        0.5,
      ),
      totalErrors: entries.reduce((sum, entry) => sum + entry.errors, 0),
      totalTimeouts: entries.reduce((sum, entry) => sum + entry.timeouts, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
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
