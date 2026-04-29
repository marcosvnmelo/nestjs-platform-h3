import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      source: {
        entry: {
          'servers/h3-profiling-server': './src/servers/h3-profiling-server.ts',
          'index': './src/index.ts',
          'profiling': './src/profiling.ts',
        },
      },
    },
  ],
  tools: {
    rspack: {
      resolve: {
        exportsFields: ['testExports', '...'],
      },
    },
  },
});
