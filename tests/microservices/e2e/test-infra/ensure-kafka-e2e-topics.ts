import { KafkaJS } from '@confluentinc/kafka-javascript';

export async function ensureKafkaE2eTopics(
  messagePatterns: readonly string[],
  brokers: [string, ...string[]],
): Promise<void> {
  const kafka = new KafkaJS.Kafka({
    kafkaJS: {
      clientId: 'e2e-ensure-topics',
      brokers,
      retry: { retries: 3 },
    },
  });

  const admin = kafka.admin();
  await admin.connect();

  const existing = new Set(await admin.listTopics());

  const REPLY = messagePatterns.map((p) => `${p}.reply` as const);
  const missing = [...messagePatterns, ...REPLY, 'notify'].filter(
    (t) => !existing.has(t),
  );

  if (missing.length > 0) {
    await admin.createTopics({
      topics: missing.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });
  }

  await admin.disconnect();
}
