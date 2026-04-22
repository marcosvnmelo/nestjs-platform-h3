import * as util from 'util';
import type { StartedKafkaContainer } from '@testcontainers/kafka';
import type { Admin, ITopicMetadata } from 'kafkajs';
import { afterAll, beforeAll, describe, it } from '@rstest/core';
import { Kafka } from 'kafkajs';
import request from 'supertest';

import type { INestApplication } from '@nestjs/common';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import type { E2EInfraConfig } from '../src/e2e-infra.ts';
import { KafkaConcurrentController } from '../src/kafka-concurrent/kafka-concurrent.controller.ts';
import { KafkaConcurrentMessagesController } from '../src/kafka-concurrent/kafka-concurrent.messages.controller.ts';
import { kafkaBrokers, startKafkaContainer } from './test-infra/containers.ts';
import { e2eInfraProvider } from './test-infra/e2e-providers.ts';
import { ensureKafkaE2eTopics } from './test-infra/ensure-kafka-e2e-topics.ts';

const REQUEST_TOPIC = 'math.sum.sync.number.wait';
const RESPONSE_TOPIC = 'math.sum.sync.number.wait.reply';

/** Message patterns from KafkaMessagesController + per-pattern reply topics (Nest ClientKafka) + event topic. */
const PATTERNS = [REQUEST_TOPIC] as const;

describe.skip('Kafka concurrent', function () {
  const numbersOfServers = 3;

  let admin: Admin;
  const servers: any[] = [];
  const apps: INestApplication[] = [];
  let kafkaContainer: StartedKafkaContainer;
  let kafkaE2e!: E2EInfraConfig;

  const logger = new Logger('concurrent-kafka.spec.ts');

  beforeAll(async () => {
    kafkaContainer = await startKafkaContainer();
    await ensureKafkaE2eTopics(PATTERNS, kafkaBrokers(kafkaContainer));
    kafkaE2e = { kafkaBrokers: kafkaBrokers(kafkaContainer) };
  });

  // set timeout to be longer (especially for the after hook)
  const startServer = async () => {
    const module = await Test.createTestingModule({
      controllers: [
        KafkaConcurrentController,
        KafkaConcurrentMessagesController,
      ],
      providers: [e2eInfraProvider(kafkaE2e)],
    }).compile();

    // use our own logger for a little
    // Logger.overrideLogger(new Logger());

    const app = module.createNestApplication<NestH3Application>(
      new H3Adapter(),
    );

    const server = app.getHttpServer();

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers: [...(kafkaE2e.kafkaBrokers as [string, ...string[]])],
        },
        run: {
          partitionsConsumedConcurrently: numbersOfServers,
        },
      },
    });

    // enable these for clean shutdown
    app.enableShutdownHooks();

    // push to the collection
    servers.push(server);
    apps.push(app);

    // await the start
    await app.startAllMicroservices();
    await app.init();
  };

  it(`Create kafka topics/partitions`, async () => {
    const kafka = new Kafka({
      clientId: 'concurrent-test-admin',
      brokers: [...(kafkaE2e.kafkaBrokers as [string, ...string[]])],
    });

    admin = kafka.admin();
    await admin.connect();

    let topicMetadata: {
      topics: ITopicMetadata[];
    };

    try {
      topicMetadata = await admin.fetchTopicMetadata({
        topics: [REQUEST_TOPIC, RESPONSE_TOPIC],
      });
    } catch (e) {
      // create with number of servers
      try {
        await admin.createTopics({
          topics: [
            {
              topic: REQUEST_TOPIC,
              numPartitions: numbersOfServers,
              replicationFactor: 1,
            },
            {
              topic: RESPONSE_TOPIC,
              numPartitions: numbersOfServers,
              replicationFactor: 1,
            },
          ],
        });
      } catch (e) {
        logger.error(util.format('Create topics error: %o', e));
      }
    }

    if (topicMetadata! && topicMetadata.topics.length > 0) {
      // we have topics, how many partitions do they have?
      for (const topic of topicMetadata.topics) {
        if (topic.partitions.length < numbersOfServers) {
          try {
            await admin.createPartitions({
              topicPartitions: [
                {
                  topic: topic.name,
                  count: numbersOfServers,
                },
              ],
            });
          } catch (e) {
            logger.error(util.format('Create partitions error: %o', e));
          }
        }
      }
    }

    // create with number of servers
    try {
      await admin.createTopics({
        topics: [
          {
            topic: REQUEST_TOPIC,
            numPartitions: numbersOfServers,
            replicationFactor: 1,
          },
          {
            topic: RESPONSE_TOPIC,
            numPartitions: numbersOfServers,
            replicationFactor: 1,
          },
        ],
      });
    } catch (e) {
      logger.error(util.format('Create topics error: %o', e));
    }

    // disconnect
    await admin.disconnect();
  });

  it(`Start Kafka apps`, async () => {
    // start all at once
    await Promise.all(
      Array(numbersOfServers)
        .fill(1)
        .map(async (_v, i) => {
          // return startServer();

          // wait in intervals so the consumers start in order
          return new Promise<void>((resolve) => {
            setTimeout(async () => {
              await startServer();

              return resolve();
            }, 1000 * i);
          });
        }),
    );
  });

  it(`Concurrent messages without forcing a rebalance.`, async () => {
    // wait a second before notifying the servers to respond
    setTimeout(async () => {
      // notify the other servers that it is time to respond
      await Promise.all(
        servers.map(async (server) => {
          // send to all servers since indexes don't necessarily align with server consumers
          await request(server).post('/go').send();
        }),
      );
    }, 1000);

    await Promise.all(
      servers.map(async (server, index) => {
        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        await request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  it(`Close kafka client consumer while waiting for message pattern response.`, async () => {
    await Promise.all(
      servers.map(async (server, index) => {
        // shut off and delete the leader
        if (index === 0) {
          return new Promise<void>((resolve) => {
            // wait a second before closing so the producers can send the message to the server consumers
            setTimeout(async () => {
              // get the controller
              const controller = apps[index].get(KafkaConcurrentController);

              // close the controller clients
              await controller.client.close();

              // notify the other servers that we have stopped
              await Promise.all(
                servers.map(async (server) => {
                  // send to all servers since indexes don't necessarily align with server consumers
                  await request(server).post('/go').send();
                }),
              );

              return resolve();
            }, 1000);
          });
        }

        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        await request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  it(`Start kafka client consumer while waiting for message pattern response.`, async () => {
    await Promise.all(
      servers.map(async (server, index) => {
        // shut off and delete the leader
        if (index === 0) {
          return new Promise<void>((resolve) => {
            // wait a second before closing so the producers can send the message to the server consumers
            setTimeout(async () => {
              // get the controller
              const controller = apps[index].get(KafkaConcurrentController);

              // connect the controller client
              await controller.client.connect();

              // notify the servers that we have started
              await Promise.all(
                servers.map(async (server) => {
                  // send to all servers since indexes don't necessarily align with server consumers
                  await request(server).post('/go').send();
                }),
              );

              return resolve();
            }, 1000);
          });
        }

        // send requests
        const payload = {
          key: index,
          numbers: [1, index],
        };
        const result = (1 + index).toString();

        await request(server)
          .post('/mathSumSyncNumberWait')
          .send(payload)
          .expect(200)
          .expect(200, result);
      }),
    );
  });

  afterAll(async () => {
    await Promise.all(apps.map(async (app) => app.close()));
    await kafkaContainer.stop();
  });
});
