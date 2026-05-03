import fs from 'node:fs/promises';
import { Session } from 'node:inspector/promises';

export function cpuProfiling() {
  let session: Session | undefined;

  return {
    start: async () => {
      session = new Session();
      session.connect();

      await session.post('Profiler.enable');
      await session.post('Profiler.start');
    },
    stop: async (outPath: string) => {
      if (!session) {
        console.warn('No session to stop');
        return;
      }

      const { profile } = await session.post('Profiler.stop');

      await fs.writeFile(outPath, JSON.stringify(profile, null, 2));

      session.disconnect();
    },
  };
}
