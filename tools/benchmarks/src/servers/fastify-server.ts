import type { AddressInfo } from 'node:net';
import fastify from 'fastify';

const app = fastify({ logger: false });

app.get('/hello', () => 'ok');

const nestBodyParser = parseBooleanArg('nest-body-parser', true);

await app.listen({ port: 0, host: '127.0.0.1' });

const address = app.server.address() as AddressInfo;
const url = `http://127.0.0.1:${address.port}`;
console.log(`Fastify server listening: ${url}`);

process.on('SIGINT', async () => {
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.close();
  process.exit(0);
});

function parseBooleanArg(name: string, defaultValue: boolean): boolean {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }

  const raw = value.slice(prefix.length).toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') {
    return true;
  }
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') {
    return false;
  }

  throw new Error(`Invalid value for --${name}: ${value.slice(prefix.length)}`);
}
