import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      app: './src/app.module.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      dts: false,
    },
  ],
});
