import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      bundle: false,
      source: {
        assetsInclude: [/\.proto$/, /\.pem/],
      },
      output: {
        copy: [
          { from: './**/*.proto', context: './src' },
          { from: './**/*.pem', context: './src' },
        ],
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
