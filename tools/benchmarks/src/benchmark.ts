// cspell:ignore mbps mbit

import type { BenchmarkCase, BenchmarkStats } from './types.ts';
import { commonArgs } from './constants/args.constants.ts';
import {
  GET_PATH,
  GET_REQUEST_OPTIONS,
  POST_PATH,
  POST_REQUEST_OPTIONS,
} from './constants/route.constants.ts';
import { ServerEnum } from './constants/server.constants.ts';
import { runAutocannon } from './utils/autocannon.utils.ts';
import {
  aggregateResults,
  printPairComparison,
  printRunStats,
  shuffleCases,
  toStats,
} from './utils/benchmark.utils.ts';
import { integerArg, parseArgs } from './utils/parse-args.utils.ts';
import {
  killServer,
  scriptPath,
  startServer,
} from './utils/spawn-server.utils.ts';

const BENCHMARK_OPTIONS = parseArgs({
  duration: commonArgs.duration,
  connections: commonArgs.connections,
  pipelining: commonArgs.pipelining,
  warmupSeconds: commonArgs.warmupSeconds,
  nestBodyParser: commonArgs.nestBodyParser,
  serverReadyMs: commonArgs.serverReadyMs,
  runs: integerArg('runs', 3),

  restMethod: commonArgs.restMethod,
});

const cases: BenchmarkCase[] = [
  {
    name: 'Pure Express',
    scriptPath: scriptPath(ServerEnum.EXPRESS),
  },
  {
    name: 'Nest Express',
    scriptPath: scriptPath(ServerEnum.NEST_EXPRESS),
  },
  {
    name: 'Pure Fastify',
    scriptPath: scriptPath(ServerEnum.FASTIFY),
  },
  {
    name: 'Nest Fastify',
    scriptPath: scriptPath(ServerEnum.NEST_FASTIFY),
  },
  {
    name: 'Pure H3',
    scriptPath: scriptPath(ServerEnum.H3),
  },
  {
    name: 'Nest H3 Adapter',
    scriptPath: scriptPath(ServerEnum.NEST_H3),
  },
  {
    name: 'Nest H3 (Unsafe) Adapter',
    scriptPath: scriptPath(ServerEnum.NEST_H3),
    args: [commonArgs.enableUnsafePolyfills.format(true)],
  },
];

await run();

async function run() {
  const results: BenchmarkStats[] = [];

  console.log(
    [
      'Running benchmark with autocannon',
      `duration=${BENCHMARK_OPTIONS.duration.value}s`,
      `connections=${BENCHMARK_OPTIONS.connections.value}`,
      `pipelining=${BENCHMARK_OPTIONS.pipelining.value}`,
      `warmup=${BENCHMARK_OPTIONS.warmupSeconds.value}s`,
      `runs=${BENCHMARK_OPTIONS.runs.value}`,
      `nestBodyParser=${BENCHMARK_OPTIONS.nestBodyParser.value}`,
    ].join(' | '),
  );

  for (let runIndex = 1; runIndex <= BENCHMARK_OPTIONS.runs.value; runIndex++) {
    console.log(`\n=== Run ${runIndex}/${BENCHMARK_OPTIONS.runs.value} ===`);
    const runCases = shuffleCases(cases);
    console.log(`Order: ${runCases.map((entry) => entry.name).join(' -> ')}`);

    for (const benchCase of runCases) {
      console.log(`\n→ ${benchCase.name}`);
      const server = await startServer(benchCase, BENCHMARK_OPTIONS);

      const GET_URL = server.url + GET_PATH;
      const POST_URL = server.url + POST_PATH;

      const targetUrl =
        BENCHMARK_OPTIONS.restMethod.value === 'GET' ? GET_URL : POST_URL;

      try {
        // Warmup
        await runAutocannon(GET_URL, {
          duration: BENCHMARK_OPTIONS.warmupSeconds.value,
          connections: BENCHMARK_OPTIONS.connections.value,
          pipelining: BENCHMARK_OPTIONS.pipelining.value,
        });

        const result = await runAutocannon(targetUrl, {
          duration: BENCHMARK_OPTIONS.duration.value,
          connections: BENCHMARK_OPTIONS.connections.value,
          pipelining: BENCHMARK_OPTIONS.pipelining.value,

          ...(BENCHMARK_OPTIONS.restMethod.value === 'GET'
            ? GET_REQUEST_OPTIONS
            : POST_REQUEST_OPTIONS),
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
