import type { AddressInfo } from 'node:net';
import express from 'express';

import { commonArgs } from '../constants/args.constants.ts';

const app = express();
const nestBodyParser = commonArgs.nestBodyParser;

if (nestBodyParser) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

app.get('/hello', (_req, res) => {
  res.send('ok');
});
app.post('/all/:path', (req, res) => {
  res.send({
    params: req.params,
    query: req.query,
    body: req.body,
  });
});

const server = app.listen(0, '127.0.0.1', () => {
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  console.log(`Express server listening: ${url}`);
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
