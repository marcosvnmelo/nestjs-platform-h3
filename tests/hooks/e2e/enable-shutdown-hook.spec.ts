import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from '@rstest/core';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('enableShutdownHooks', () => {
  const packageRoot = join(__dirname, '..');
  const entrypoint = join(packageRoot, 'dist/enable-shutdown-hooks-main.js');

  const runScript = (...args: string[]) =>
    spawnSync(process.execPath, [entrypoint, ...args], {
      env: {
        cwd: packageRoot,
        ...process.env,
        TS_NODE_PROJECT: join(packageRoot, 'tsconfig.json'),
      },
    });

  it('should call the correct hooks if any shutdown signal gets invoked', async () => {
    await new Promise<void>((done) => {
      const result = runScript('SIGHUP');
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).to.equal('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).to.equal('onApplicationShutdown SIGHUP');
      done();
    });
  });

  it('should call the correct hooks if a specific shutdown signal gets invoked', async () => {
    await new Promise<void>((done) => {
      const result = runScript('SIGINT', 'SIGINT');
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).to.equal('beforeApplicationShutdown SIGINT');
      expect(calls[1]).to.equal('onApplicationShutdown SIGINT');
      done();
    });
  });

  it('should ignore system signals which are not specified', async () => {
    await new Promise<void>((done) => {
      const result = runScript('SIGINT', 'SIGHUP');
      expect(result.stdout.toString().trim()).to.be.eq('');
      done();
    });
  });

  it('should ignore system signals if "enableShutdownHooks" was not called', async () => {
    await new Promise<void>((done) => {
      const result = runScript('SIGINT', 'NONE');
      expect(result.stdout.toString().trim()).to.be.eq('');
      done();
    });
  });

  it('should call the correct hooks with useProcessExit option', async () => {
    await new Promise<void>((done) => {
      const result = runScript('SIGHUP', 'SIGHUP', 'graceful');
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).to.equal('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).to.equal('onApplicationShutdown SIGHUP');
      expect(result.status).to.equal(0);
      done();
    });
  });
});
