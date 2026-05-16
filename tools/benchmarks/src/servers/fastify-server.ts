import type { AddressInfo } from 'node:net';
import fastify from 'fastify';

import { commonArgs } from '../constants/args.constants.ts';
import { parseArgs } from '../utils/parse-args.utils.ts';

const OPTIONS = parseArgs({
  port: commonArgs.port,
});

const app = fastify({ logger: false });

app.get('/hello', () => 'ok');
app.post('/all/:path', (req, res) => {
  res.send({
    params: req.params,
    query: req.query,
    body: req.body,
  });
});

await app.listen({ port: OPTIONS.port.value, host: '127.0.0.1' });

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
