import type { GlobalConfig } from '@confluentinc/kafka-javascript';
import type { StartedKafkaContainer } from '@testcontainers/kafka';
import type { StartedTestContainer } from 'testcontainers';
import { KafkaJS } from '@confluentinc/kafka-javascript';
import { expect } from '@rstest/core';
import { KafkaContainer } from '@testcontainers/kafka';
import { GenericContainer, Wait } from 'testcontainers';

// cspell:words mosquitto confluentinc

export const IMAGES = {
  redis: 'redis',
  nats: 'nats',
  mosquitto: 'eclipse-mosquitto',
  rabbitmq: 'rabbitmq:management',
  kafka: 'confluentinc/cp-kafka:8.2.0',
} as const;

/** PLAINTEXT client port (see @testcontainers/kafka KAFKA_PORT / addPlaintextListener; not 9092 BROKER). */
const KAFKA_CLIENT_PORT = 9093;

export function kafkaBootstrapServers(
  container: StartedKafkaContainer,
): string {
  return `${container.getHost()}:${container.getMappedPort(KAFKA_CLIENT_PORT)}`;
}

export function kafkaBrokers(
  container: StartedKafkaContainer,
): [string, ...string[]] {
  return [kafkaBootstrapServers(container)];
}

async function assertMessageProducedAndConsumed(
  container: StartedKafkaContainer,
  additionalKafkaConfig: Partial<KafkaJS.KafkaConfig> = {},
  additionalGlobalConfig: Partial<GlobalConfig> = {},
) {
  const brokers = [`${container.getHost()}:${container.getMappedPort(9093)}`];
  const kafka = new KafkaJS.Kafka({
    kafkaJS: {
      logLevel: KafkaJS.logLevel.ERROR,
      brokers,
      ...additionalKafkaConfig,
    },
    ...additionalGlobalConfig,
  });

  const producer = kafka.producer();
  await producer.connect();
  const consumer = kafka.consumer({
    kafkaJS: { groupId: 'test-group', fromBeginning: true },
  });
  await consumer.connect();

  await producer.send({
    topic: 'test-topic',
    messages: [{ value: 'test message' }],
  });
  await consumer.subscribe({ topic: 'test-topic' });

  const consumedMessage = await new Promise((resolve) =>
    consumer.run({
      eachMessage: async ({ message }) => resolve(message.value?.toString()),
    }),
  );
  expect(consumedMessage).toBe('test message');

  await consumer.disconnect();
  await producer.disconnect();
}

export async function startKafkaContainer(): Promise<StartedKafkaContainer> {
  const kafkaContainer = await new KafkaContainer(IMAGES.kafka)
    .withEnvironment({
      // Optimization for tests
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: '0',
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: '1',
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: '1',
      KAFKA_DELETE_TOPIC_ENABLE: 'true',
    })
    .start();

  /** Wait until broker answers metadata (KRaft can be up after port open but not ready for Nest/kafkajs). */
  await assertMessageProducedAndConsumed(kafkaContainer);

  return kafkaContainer;
}

const REDIS_PORT = 6379;

export async function startRedisContainer(): Promise<StartedTestContainer> {
  return new GenericContainer(IMAGES.redis)
    .withExposedPorts(REDIS_PORT)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
}

export function nestRedisOptions(container: StartedTestContainer): {
  host: string;
  port: number;
} {
  return {
    host: container.getHost(),
    port: container.getMappedPort(REDIS_PORT),
  };
}

const NATS_PORT = 4222;

export async function startNatsContainer(): Promise<StartedTestContainer> {
  const natsContainer = await new GenericContainer(IMAGES.nats)
    .withExposedPorts(NATS_PORT)
    .withWaitStrategy(Wait.forLogMessage(/.*Server is ready.*/))
    .withStartupTimeout(120_000)
    .start();

  return natsContainer;
}

export function nestNatsServers(container: StartedTestContainer): string {
  return `${container.getHost()}:${container.getMappedPort(NATS_PORT)}`;
}

const MOSQUITTO_CONF = `listener 1883
allow_anonymous true
`;

export async function startMosquittoContainer(): Promise<StartedTestContainer> {
  const mosquittoContainer = await new GenericContainer(IMAGES.mosquitto)
    .withExposedPorts(1883)
    .withCopyContentToContainer([
      {
        content: MOSQUITTO_CONF,
        target: '/mosquitto/config/mosquitto.conf',
      },
    ])
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  return mosquittoContainer;
}

export function nestMqttUrl(container: StartedTestContainer): string {
  return `mqtt://${container.getHost()}:${container.getMappedPort(1883)}`;
}

export async function startRabbitContainer(): Promise<StartedTestContainer> {
  const rabbitContainer = await new GenericContainer(IMAGES.rabbitmq)
    .withExposedPorts(5672)
    .withWaitStrategy(
      Wait.forLogMessage(/Server startup complete|ready to accept connections/),
    )
    .start();

  return rabbitContainer;
}

export function nestRmqUrl(container: StartedTestContainer): string {
  return `amqp://${container.getHost()}:${container.getMappedPort(5672)}`;
}
