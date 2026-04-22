import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
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
