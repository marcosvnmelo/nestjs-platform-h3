import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRslibConfig(),
  maxConcurrency: 1,
  pool: { maxWorkers: 1 },
  /** shared-server test waits 25s on blocked close() */
  testTimeout: 30_000,
});
