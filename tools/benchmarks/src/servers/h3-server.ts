import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { getQuery, getRouterParams, H3, toNodeHandler } from 'h3';

const app = new H3();
app.get('/hello', () => 'ok');
app.post('/all/:path', async (event) => {
  return {
    params: getRouterParams(event, { decode: true }),
    query: getQuery(event),
    body: await event.req.json(),
  };
});

const server = createServer(toNodeHandler(app));
server.listen(0, '127.0.0.1', () => {
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`H3 server listening: ${url}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
