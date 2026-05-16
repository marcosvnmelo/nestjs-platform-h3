import type { AddressInfo } from 'node:net';
import express from 'express';

import { commonArgs } from '../constants/args.constants.ts';
import { parseArgs } from '../utils/parse-args.utils.ts';

const OPTIONS = parseArgs({
  nestBodyParser: commonArgs.nestBodyParser,
  port: commonArgs.port,
});

const app = express();

if (OPTIONS.nestBodyParser.value) {
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

const server = app.listen(OPTIONS.port.value, '127.0.0.1', () => {
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
