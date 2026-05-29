import { withRslibConfig } from '@rstest/adapter-rslib';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRslibConfig(),
  // H3 apps default :3000; parallel files → EADDRINUSE. E2E uses module DI, not process.env.
  pool: { maxWorkers: 1 },
});
