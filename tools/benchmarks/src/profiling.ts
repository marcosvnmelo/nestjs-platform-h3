import { fileURLToPath } from 'node:url';

import type { ServerProcess } from './types.ts';
import { commonArgs } from './constants/args.constants.ts';
import {
  GET_PATH,
  POST_PATH,
  parseRestMethod,
  requestOptionsFor,
} from './constants/route.constants.ts';
import { ServerEnum, serverFileMap } from './constants/server.constants.ts';
import { runAutocannon } from './utils/autocannon.utils.ts';
import { printRunStats, toStats } from './utils/benchmark.utils.ts';
import { parseArgs, stringArg } from './utils/parse-args.utils.ts';
import { killServer, startServer } from './utils/spawn-server.utils.ts';

const now = Date.now();

const BENCHMARK_OPTIONS = parseArgs({
  duration: commonArgs.duration,
  connections: commonArgs.connections,
  pipelining: commonArgs.pipelining,
  warmupSeconds: commonArgs.warmupSeconds,
  nestBodyParser: commonArgs.nestBodyParser,
  serverReadyMs: commonArgs.serverReadyMs,

  restMethod: commonArgs.restMethod,

  enableUnsafePolyfills: commonArgs.enableUnsafePolyfills.defaultValue(true),
  enableProfiling: commonArgs.enableProfiling.defaultValue(true),
  port: commonArgs.port.defaultValue(3000),
  bootstrapProfileOut: commonArgs.bootstrapProfileOut.defaultValue(
    `cpu-profile-${now}.bootstrap.cpuprofile`,
  ),
  profileOut: commonArgs.profileOut.defaultValue(
    `cpu-profile-${now}.server.cpuprofile`,
  ),

  url: stringArg('url'),
  server: stringArg('server', ServerEnum.NEST_H3),
});
const REST_METHOD = parseRestMethod(BENCHMARK_OPTIONS.restMethod.value);

await run();

async function run() {
  let server: ServerProcess | undefined;
  let baseUrl = BENCHMARK_OPTIONS.url.value;

  const serverName = `${BENCHMARK_OPTIONS.server.value} with profiling`;

  try {
    if (!baseUrl) {
      const SERVER_SCRIPT = fileURLToPath(
        import.meta.resolve(
          `./servers/${serverFileMap[BENCHMARK_OPTIONS.server.value as ServerEnum]}`,
        ),
      );

      server = await startServer(
        {
          name: serverName,
          scriptPath: SERVER_SCRIPT,
          args: [
            BENCHMARK_OPTIONS.bootstrapProfileOut.raw,
            BENCHMARK_OPTIONS.profileOut.raw,
            BENCHMARK_OPTIONS.enableUnsafePolyfills.raw,
            BENCHMARK_OPTIONS.enableProfiling.raw,
            BENCHMARK_OPTIONS.port.raw,
            commonArgs.port.format(3000),
          ],
        },
        BENCHMARK_OPTIONS,
      );
      baseUrl = server.url;
    }

    const GET_URL = baseUrl + GET_PATH;
    const POST_URL = baseUrl + POST_PATH;

    const targetUrl =
      REST_METHOD === 'GET' ? GET_URL : POST_URL;

    console.log(
      [
        server
          ? `Autocannon (spawned ${serverName})`
          : 'Autocannon (external url)',
        `url=${targetUrl}`,
        `duration=${BENCHMARK_OPTIONS.duration.value}s`,
        `connections=${BENCHMARK_OPTIONS.connections.value}`,
        `pipelining=${BENCHMARK_OPTIONS.pipelining.value}`,
        `warmup=${BENCHMARK_OPTIONS.warmupSeconds.value}s`,
      ].join(' | '),
    );

    await runAutocannon(targetUrl, {
      duration: BENCHMARK_OPTIONS.warmupSeconds.value,
      connections: BENCHMARK_OPTIONS.connections.value,
      pipelining: BENCHMARK_OPTIONS.pipelining.value,
      ...requestOptionsFor(REST_METHOD),
    });

    const result = await runAutocannon(targetUrl, {
      duration: BENCHMARK_OPTIONS.duration.value,
      connections: BENCHMARK_OPTIONS.connections.value,
      pipelining: BENCHMARK_OPTIONS.pipelining.value,
      ...requestOptionsFor(REST_METHOD),
    });

    const stats = toStats(serverName, result, 0);
    printRunStats(stats);

    console.log('\nRaw results');
    console.table([
      {
        'name': stats.name,
        'req/s': stats.requestsPerSec.toFixed(2),
        'lat(avg) ms': stats.latencyAvgMs.toFixed(2),
        'lat(p99) ms': stats.latencyP99Ms.toFixed(2),
        'mbit/s': stats.throughputMbps.toFixed(2),
        'errors': stats.errors,
        'timeouts': stats.timeouts,
      },
    ]);
  } finally {
    if (server) {
      await killServer(server);
    }
  }
}
