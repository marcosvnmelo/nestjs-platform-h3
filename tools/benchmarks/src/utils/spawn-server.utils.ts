import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import type { ChildProcess } from 'node:child_process';

import type { ServerEnum } from '../constants/server.constants.ts';
import type { BenchmarkCase, ServerProcess } from '../types.ts';
import type { Arg } from './parse-args.utils.ts';
import { serverFileMap } from '../constants/server.constants.ts';

export async function startServer(
  benchCase: BenchmarkCase,
  benchmarkOptions: {
    nestBodyParser: Arg<boolean>;
    serverReadyMs: Arg<number>;
  },
): Promise<ServerProcess> {
  const args = [
    benchCase.scriptPath,
    benchmarkOptions.nestBodyParser.raw,
    ...(benchCase.args ?? []),
  ];

  const child = spawn(process.execPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    detached: false,
  });

  if (child.stdout) child.stdout.setEncoding('utf8');
  if (child.stderr) child.stderr.setEncoding('utf8');

  child.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0 && !signal) {
      console.error(`${benchCase.name} exited with code ${code}`);
    }
  });

  child.on('error', (error) => {
    console.error(`${benchCase.name} spawn error:`, error);
  });

  const url = await waitForServerUrl(
    child,
    benchCase.name,
    benchmarkOptions.serverReadyMs.value,
  );
  return { url, pid: child };
}

async function waitForServerUrl(
  child: ChildProcess,
  name: string,
  timeoutMs: number,
): Promise<string> {
  const stream = (() => {
    const out = child.stdout;
    if (!out) {
      throw new Error(`${name} has no stdout`);
    }
    return out;
  })();

  let buffer = '';
  let settled = false;

  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(onTimeout, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      stream.removeListener('data', listener);
      child.removeListener('exit', onExit);
    }

    function onTimeout() {
      if (!settled) {
        settled = true;
        cleanup();
        reject(
          new Error(
            `Timed out waiting for ${name} listening line (${timeoutMs}ms)\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    timer.unref?.();

    function listener(chunk: string) {
      process.stdout.write(chunk);
      buffer += chunk;
      const match = buffer.match(/listening:\s+(https?:\/\/[^\s]+)/);
      if (match?.[1] && !settled) {
        settled = true;
        cleanup();
        resolve(match[1]);
      }
    }

    function onExit(code: number | null, signal: NodeJS.Signals | null) {
      if (!settled) {
        settled = true;
        cleanup();
        reject(
          new Error(
            `${name} exited before ready (code=${code}, signal=${signal})\nCaptured stdout segment:\n${buffer.slice(-2000)}`,
          ),
        );
      }
    }

    stream.addListener('data', listener);
    child.once('exit', onExit);
  });
}

export async function killServer(server: ServerProcess): Promise<void> {
  const pid = server.pid.pid;
  if (pid === undefined) {
    return;
  }

  if (server.pid.exitCode !== null || server.pid.signalCode !== null) {
    return;
  }

  if (!server.pid.killed) {
    server.pid.kill('SIGTERM');
  }

  await Promise.race([once(server.pid, 'exit'), delay(8000)]);

  if (server.pid.exitCode === null && server.pid.signalCode === null) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already dead / invalid pid as expected on races
    }

    await Promise.race([once(server.pid, 'exit'), delay(3000)]);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function scriptPath(name: ServerEnum) {
  return fileURLToPath(
    import.meta.resolve(`../servers/${serverFileMap[name]}`),
  );
}
