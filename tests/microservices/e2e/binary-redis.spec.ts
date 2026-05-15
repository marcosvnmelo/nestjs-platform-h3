import type { StartedTestContainer } from 'testcontainers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@rstest/core';
import { Redis } from 'ioredis';
import { lastValueFrom } from 'rxjs';

import type { INestApplication } from '@nestjs/common';
import type {
  ClientRedis,
  Deserializer,
  IncomingResponse,
} from '@nestjs/microservices';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import {
  nestRedisOptions,
  startRedisContainer,
} from './test-infra/containers.ts';

class BinaryDeserializer implements Deserializer<Buffer, IncomingResponse> {
  deserialize(value: Buffer): IncomingResponse {
    const firstSeparatorIndex = value.indexOf(':');
    const secondSeparatorIndex = value.indexOf(':', firstSeparatorIndex + 1);

    return {
      id: value.subarray(0, firstSeparatorIndex).toString(),
      isDisposed: true,
      err: null,
      response: value.subarray(secondSeparatorIndex + 1),
    };
  }
}

describe('REDIS transport', () => {
  let app: INestApplication;
  let client: ClientRedis;
  let pub: Redis;
  let sub: Redis;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await startRedisContainer();
  });
  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    const redis = nestRedisOptions(container);
    const module = await Test.createTestingModule({
      imports: [
        ClientsModule.register({
          clients: [
            {
              name: 'REDIS_SERVICE',
              transport: Transport.REDIS,
              options: {
                returnBuffers: true,
                ...redis,
                deserializer: new BinaryDeserializer(),
              },
            },
          ],
        }),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());

    pub = new Redis(redis);
    sub = new Redis(redis);

    await sub.subscribe('binary', (_, __) => {});

    sub.on('message', async (channel, message) => {
      const data = JSON.parse(message);
      const delay = data.data === 'slow' ? 25 : 0;
      const responseBody =
        data.data === 'bytes'
          ? Buffer.from([0, 1, 2, 3, 255])
          : Buffer.from(`${data.data}-replied`);
      const response = Buffer.concat([
        Buffer.from(`${data.id}:${channel}:`),
        responseBody,
      ]);

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      await pub.publish(`${channel}.reply`, response);
    });

    client = app.get<ClientRedis>('REDIS_SERVICE');

    await client.connect();

    await app.init();
  });

  it('should return a raw binary payload', async () => {
    const data = await lastValueFrom(client.send('binary', 'data'));
    expect(Buffer.isBuffer(data)).to.be.true;
    expect(data).to.deep.equal(Buffer.from('data-replied'));
  });

  it('should route concurrent raw binary replies to the matching request', async () => {
    const [slowResponse, fastResponse] = await Promise.all([
      lastValueFrom(client.send('binary', 'slow')),
      lastValueFrom(client.send('binary', 'fast')),
    ]);
    expect(Buffer.isBuffer(slowResponse)).to.be.true;
    expect(Buffer.isBuffer(fastResponse)).to.be.true;
    expect(slowResponse).to.deep.equal(Buffer.from('slow-replied'));
    expect(fastResponse).to.deep.equal(Buffer.from('fast-replied'));
  });

  it('should preserve non-utf8 bytes in the raw binary payload', async () => {
    const data = await lastValueFrom(client.send('binary', 'bytes'));
    expect(Buffer.isBuffer(data)).to.be.true;
    expect(data).to.deep.equal(Buffer.from([0, 1, 2, 3, 255]));
  });

  afterEach(async () => {
    await app.close();
    await client.close();
    await pub.quit();
    await sub.quit();
  });
});
