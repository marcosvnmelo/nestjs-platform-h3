import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRslibConfig(),
  globalSetup: ['./global-setup.ts'],
  pool: { maxWorkers: 2 },
});
