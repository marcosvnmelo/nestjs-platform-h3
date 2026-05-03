import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import type { Result } from 'autocannon';
import type { ChildProcess } from 'node:child_process';

import type { BenchmarkStats } from './types.ts';
import { runAutocannon } from './utils/autocannon.utils.ts';
import {
  parseBooleanArg,
  parseIntegerArg,
  parseStringArg,
} from './utils/parse-args.utils.ts';

// cspell:ignore mbps mbit

const PROFILING_SERVER_SCRIPT = fileURLToPath(
  import.meta.resolve('./servers/h3-profiling-server.js'),
);

const LISTENING_LINE = /Nest H3 server listening:\s+(https?:\/\/[^\s]+)/;

type ProfileBenchmarkStats = Omit<BenchmarkStats, 'run'>;

const now = Date.now();

const BENCHMARK_OPTIONS = {
  url: parseStringArg('url'),
  serverReadyMs: parseIntegerArg('server-ready-timeout', 120_000),
  bootstrapProfileOut: parseStringArg(
    'bootstrap-profile-out',
    `cpu-profile-${now}.bootstrap.cpuprofile`,
  ),
  profileOut: parseStringArg(
    'profile-out',
    `cpu-profile-${now}.server.cpuprofile`,
  ),
  nestBodyParser: parseBooleanArg('nest-body-parser', true),
  duration: parseIntegerArg('duration', 10),
  connections: parseIntegerArg('connections', 10),
  pipelining: parseIntegerArg('pipelining', 1),
  warmupSeconds: parseIntegerArg('warmup', 2),
  label: parseStringArg('label', 'load'),
  enableUnsafePolyfills: parseBooleanArg('enable-unsafe-polyfills', false),
};

await run();

async function run() {
  const results: ProfileBenchmarkStats[] = [];
  let serverChild: ChildProcess | undefined;
  let baseUrl = BENCHMARK_OPTIONS.url;

  try {
    if (!baseUrl) {
      serverChild = spawnProfilingServer({
        bootstrapProfileOut: BENCHMARK_OPTIONS.bootstrapProfileOut,
        profileOut: BENCHMARK_OPTIONS.profileOut,
        nestBodyParser: BENCHMARK_OPTIONS.nestBodyParser,
        enableUnsafePolyfills: BENCHMARK_OPTIONS.enableUnsafePolyfills,
      });
      baseUrl = await waitForServerBaseUrl(
        serverChild,
        BENCHMARK_OPTIONS.serverReadyMs,
      );
    }

    const base = baseUrl.replace(/\/hello\/?$/i, '').replace(/\/$/, '');
    const targetUrl = `${base}/hello`;

    console.log(
      [
        serverChild
          ? 'Autocannon (spawned Nest H3 profiling-server)'
          : 'Autocannon (external url)',
        `url=${targetUrl}`,
        `duration=${BENCHMARK_OPTIONS.duration}s`,
        `connections=${BENCHMARK_OPTIONS.connections}`,
        `pipelining=${BENCHMARK_OPTIONS.pipelining}`,
        `warmup=${BENCHMARK_OPTIONS.warmupSeconds}s`,
        `label=${BENCHMARK_OPTIONS.label}`,
      ].join(' | '),
    );

    await runAutocannon(targetUrl, {
      duration: BENCHMARK_OPTIONS.warmupSeconds,
      connections: BENCHMARK_OPTIONS.connections,
      pipelining: BENCHMARK_OPTIONS.pipelining,
    });

    const result = await runAutocannon(targetUrl, {
      duration: BENCHMARK_OPTIONS.duration,
      connections: BENCHMARK_OPTIONS.connections,
      pipelining: BENCHMARK_OPTIONS.pipelining,
    });

    const stats = toStats(BENCHMARK_OPTIONS.label, result);
    results.push(stats);
    printRunStats(stats);

    console.log('\nRaw per-run results');
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
  } finally {
    if (serverChild) {
      await killSpawnedServer(serverChild);
    }
  }
}

function spawnProfilingServer(opts: {
  bootstrapProfileOut: string;
  profileOut: string;
  nestBodyParser: boolean;
  enableUnsafePolyfills: boolean;
}): ChildProcess {
  const args = [
    PROFILING_SERVER_SCRIPT,
    `--bootstrap-profile-out=${opts.bootstrapProfileOut}`,
    `--profile-out=${opts.profileOut}`,
    `--nest-body-parser=${opts.nestBodyParser}`,
    `--enable-unsafe-polyfills=${opts.enableUnsafePolyfills}`,
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
      console.error(`profiling-server exited with code ${code}`);
    }
  });

  child.on('error', (error) => {
    console.error('profiling-server spawn error:', error);
  });

  return child;
}

async function waitForServerBaseUrl(child: ChildProcess, timeoutMs: number) {
  const stream = (() => {
    const out = child.stdout;
    if (!out) {
      throw new Error('profiling-server has no stdout');
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
            `Timed out waiting for Nest H3 server listening line (${timeoutMs}ms)\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    timer.unref?.();

    function listener(chunk: string) {
      process.stdout.write(chunk);
      buffer += chunk;
      const match = buffer.match(LISTENING_LINE);
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
            `profiling-server exited before ready (code=${code}, signal=${signal})\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    stream.addListener('data', listener);
    child.once('exit', onExit);
  });
}

async function killSpawnedServer(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (pid === undefined) {
    return;
  }

  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (!child.killed) {
    child.kill('SIGTERM');
  }

  await Promise.race([once(child, 'exit'), delay(8000)]);

  if (child.exitCode === null && child.signalCode === null) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already dead / invalid pid as expected on races
    }

    await Promise.race([once(child, 'exit'), delay(3000)]);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toStats(name: string, result: Result): ProfileBenchmarkStats {
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

function printRunStats(stats: ProfileBenchmarkStats) {
  console.log(
    [
      `req/s=${stats.requestsPerSec.toFixed(2)}`,
      `lat(avg)=${stats.latencyAvgMs.toFixed(2)}ms`,
      `lat(p99)=${stats.latencyP99Ms.toFixed(2)}ms`,
      `errors=${stats.errors}`,
      `timeouts=${stats.timeouts}`,
    ].join(' | '),
  );
}
