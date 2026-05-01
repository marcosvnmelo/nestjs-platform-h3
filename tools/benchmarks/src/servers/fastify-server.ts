import type { AddressInfo } from 'node:net';
import fastify from 'fastify';

const app = fastify({ logger: false });

app.get('/hello', () => 'ok');

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
