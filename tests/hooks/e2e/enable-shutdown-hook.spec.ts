import { spawnSync } from 'child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from '@rstest/core';

const nodeCmd = process.execPath;
const require = createRequire(import.meta.url);

function tsxCliPath(): string {
  const pkgRoot = dirname(require.resolve('tsx/package.json'));
  return join(pkgRoot, 'dist/cli.mjs');
}

/** TS via tsx; `jiti/register` + Nest → ERR_REQUIRE_ASYNC_MODULE on Node 24. */
function spawnTsNode(...args: string[]) {
  return spawnSync(nodeCmd, [tsxCliPath(), ...args]);
}

describe('enableShutdownHooks', () => {
  it('should call the correct hooks if any shutdown signal gets invoked', () =>
    new Promise<void>((done) => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGHUP',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).toBe('onApplicationShutdown SIGHUP');
      done();
    }));

  it('should call the correct hooks if a specific shutdown signal gets invoked', () =>
    new Promise<void>((done) => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'SIGINT',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGINT');
      expect(calls[1]).toBe('onApplicationShutdown SIGINT');
      done();
    }));

  it('should ignore system signals which are not specified', () =>
    new Promise<void>((done) => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'SIGHUP',
      );
      expect(result.stdout.toString().trim()).toBe('');
      done();
    }));

  it('should ignore system signals if "enableShutdownHooks" was not called', () =>
    new Promise<void>((done) => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGINT',
        'NONE',
      );
      expect(result.stdout.toString().trim()).toBe('');
      done();
    }));

  it('should call the correct hooks with useProcessExit option', () =>
    new Promise<void>((done) => {
      const result = spawnTsNode(
        join(import.meta.dirname, '../src/enable-shutdown-hooks-main.ts'),
        'SIGHUP',
        'SIGHUP',
        'graceful',
      );
      const calls = result.stdout
        .toString()
        .split('\n')
        .map((call: string) => call.trim());
      expect(calls[0]).toBe('beforeApplicationShutdown SIGHUP');
      expect(calls[1]).toBe('onApplicationShutdown SIGHUP');
      expect(result.status).toBe(0);
      done();
    }));
});
