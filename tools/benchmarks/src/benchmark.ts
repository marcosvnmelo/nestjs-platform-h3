import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Result } from 'autocannon';
import type { ChildProcess } from 'node:child_process';
import autocannon from 'autocannon';

import { parseBooleanArg, parseIntegerArg } from './utils/parse-args.utils.ts';

interface ServerProcess {
  url: string;
  pid: ChildProcess;
}

interface BenchmarkCase {
  name: string;
  scriptPath: string;
  args?: string[];
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

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVERS_DIR = path.join(SCRIPT_DIR, 'servers');

const BENCHMARK_OPTIONS = {
  duration: parseIntegerArg('duration', 10),
  connections: parseIntegerArg('connections', 10),
  pipelining: parseIntegerArg('pipelining', 1),
  warmupSeconds: parseIntegerArg('warmup', 2),
  runs: parseIntegerArg('runs', 3),
  nestBodyParser: parseBooleanArg('nest-body-parser', true),
  serverReadyMs: parseIntegerArg('server-ready-timeout', 120_000),
};

const cases: BenchmarkCase[] = [
  {
    name: 'Pure Express',
    scriptPath: path.join(SERVERS_DIR, 'express-server.js'),
  },
  {
    name: 'Nest Express',
    scriptPath: path.join(SERVERS_DIR, 'nest-express-server.js'),
  },
  {
    name: 'Pure Fastify',
    scriptPath: path.join(SERVERS_DIR, 'fastify-server.js'),
  },
  {
    name: 'Nest Fastify',
    scriptPath: path.join(SERVERS_DIR, 'nest-fastify-server.js'),
  },
  { name: 'Pure H3', scriptPath: path.join(SERVERS_DIR, 'h3-server.js') },
  {
    name: 'Nest H3 Adapter',
    scriptPath: path.join(SERVERS_DIR, 'nest-h3-server.js'),
  },
  {
    name: 'Nest H3 (Unsafe) Adapter',
    scriptPath: path.join(SERVERS_DIR, 'nest-h3-server.js'),
    args: ['--enable-unsafe-polyfills=true'],
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
      const server = await startServer(benchCase);

      try {
        await runAutocannon(`${server.url}/hello`, {
          duration: BENCHMARK_OPTIONS.warmupSeconds,
          connections: BENCHMARK_OPTIONS.connections,
          pipelining: BENCHMARK_OPTIONS.pipelining,
        });

        const result = await runAutocannon(`${server.url}/hello`, {
          duration: BENCHMARK_OPTIONS.duration,
          connections: BENCHMARK_OPTIONS.connections,
          pipelining: BENCHMARK_OPTIONS.pipelining,
        });

        const stats = toStats(benchCase.name, result, runIndex);
        results.push(stats);
        printRunStats(stats);
      } finally {
        await killServer(server);
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
  printPairComparison(aggregates, 'Pure H3', 'Nest H3 (Unsafe) Adapter');
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

async function startServer(benchCase: BenchmarkCase): Promise<ServerProcess> {
  const args = [
    benchCase.scriptPath,
    `--nest-body-parser=${BENCHMARK_OPTIONS.nestBodyParser}`,
    ...(benchCase.args ?? []),
  ];

  const child = spawn(process.execPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: false,
  });

  if (child.stdout) child.stdout.setEncoding('utf8');
  if (child.stderr) child.stderr.setEncoding('utf8');

  child.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0 && !signal) {
      console.error(`${benchCase.name} exited with code ${code}`);
    }
  });

  child.on('error', (error) => {
    console.error(`${benchCase.name} spawn error:`, error);
  });

  const url = await waitForServerUrl(
    child,
    benchCase.name,
    BENCHMARK_OPTIONS.serverReadyMs,
  );
  return { url, pid: child };
}

async function waitForServerUrl(
  child: ChildProcess,
  name: string,
  timeoutMs: number,
): Promise<string> {
  const stream = (() => {
    const out = child.stdout;
    if (!out) {
      throw new Error(`${name} has no stdout`);
    }
    return out;
  })();

  let buffer = '';
  let settled = false;

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(onTimeout, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      stream.removeListener('data', listener);
      child.removeListener('exit', onExit);
    }

    function onTimeout() {
      if (!settled) {
        settled = true;
        cleanup();
        reject(
          new Error(
            `Timed out waiting for ${name} listening line (${timeoutMs}ms)\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    timer.unref?.();

    function listener(chunk: string) {
      process.stdout.write(chunk);
      buffer += chunk;
      const match = buffer.match(/listening:\s+(https?:\/\/[^\s]+)/);
      if (match?.[1] && !settled) {
        settled = true;
        cleanup();
        resolve(match[1]);
      }
    }

    function onExit(code: number | null, signal: NodeJS.Signals | null) {
      if (!settled) {
        settled = true;
        cleanup();
        reject(
          new Error(
            `${name} exited before ready (code=${code}, signal=${signal})\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    stream.addListener('data', listener);
    child.once('exit', onExit);
  });
}

async function killServer(server: ServerProcess): Promise<void> {
  const pid = server.pid.pid;
  if (pid === undefined) {
    return;
  }

  if (server.pid.exitCode !== null || server.pid.signalCode !== null) {
    return;
  }

  if (!server.pid.killed) {
    server.pid.kill('SIGTERM');
  }

  await Promise.race([once(server.pid, 'exit'), delay(8000)]);

  if (server.pid.exitCode === null && server.pid.signalCode === null) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already dead / invalid pid as expected on races
    }

    await Promise.race([once(server.pid, 'exit'), delay(3000)]);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
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
