import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: false,
      source: {
        assetsInclude: [/\.graphql/],
      },
      output: {
        copy: [{ from: './**/*.graphql', context: './src' }],
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
