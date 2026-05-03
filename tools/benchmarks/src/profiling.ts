import { fileURLToPath } from 'node:url';

import type { ServerProcess } from './types.ts';
import { commonArgs } from './constants/args.constants.ts';
import {
  GET_PATH,
  GET_REQUEST_OPTIONS,
  POST_PATH,
  POST_REQUEST_OPTIONS,
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

  enableUnsafePolyfills: commonArgs.enableUnsafePolyfills,
  enableProfiling: commonArgs.enableProfiling,
  bootstrapProfileOut: commonArgs.bootstrapProfileOut.defaultValue(
    `cpu-profile-${now}.bootstrap.cpuprofile`,
  ),
  profileOut: commonArgs.profileOut.defaultValue(
    `cpu-profile-${now}.server.cpuprofile`,
  ),

  url: stringArg('url'),
  server: stringArg('server', ServerEnum.NEST_H3),
});

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
      BENCHMARK_OPTIONS.restMethod.value === 'GET' ? GET_URL : POST_URL;

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

    const stats = toStats(serverName, result, 0);
    printRunStats(stats);
  } finally {
    if (server) {
      await killServer(server);
    }
  }
}
