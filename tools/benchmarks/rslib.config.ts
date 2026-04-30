import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      source: {
        entry: {
          'servers/express-server': './src/servers/express-server.ts',
          'servers/fastify-server': './src/servers/fastify-server.ts',
          'servers/h3-profiling-server': './src/servers/h3-profiling-server.ts',
          'servers/h3-server': './src/servers/h3-server.ts',
          'servers/nest-express-server': './src/servers/nest-express-server.ts',
          'servers/nest-fastify-server': './src/servers/nest-fastify-server.ts',
          'servers/nest-h3-server': './src/servers/nest-h3-server.ts',
          'benchmark': './src/benchmark.ts',
          'profiling': './src/profiling.ts',
        },
      },
    },
  ],
});
