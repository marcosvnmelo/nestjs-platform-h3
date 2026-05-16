import type { AddressInfo } from 'node:net';
import { getQuery, getRouterParams, H3, serve } from 'h3';

import { commonArgs } from '../constants/args.constants.ts';
import { parseArgs } from '../utils/parse-args.utils.ts';

const OPTIONS = parseArgs({
  port: commonArgs.port,
});

const app = new H3();
app.get('/hello', () => 'ok');
app.post('/all/:path', async (event) => {
  return {
    params: getRouterParams(event, { decode: true }),
    query: getQuery(event),
    body: await event.req.json(),
  };
});

const h3Server = serve(app, {
  hostname: '127.0.0.1',
  port: OPTIONS.port.value,
  manual: true,
  silent: true,
});

const server = h3Server.node?.server;
if (!server) throw new Error('Server object is not defined');

await h3Server.serve();

const address = server.address() as AddressInfo;
const url = `http://127.0.0.1:${address.port}`;
console.log(`H3 server listening: ${url}`);

process.on('SIGINT', () => {
  void h3Server.close(true).then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  void h3Server.close(true).then(() => {
    process.exit(0);
  });
});
