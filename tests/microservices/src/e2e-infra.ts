import type { InjectionToken } from '@nestjs/common';

/**
 * Injected into test microservice modules by e2e specs. Lets Testcontainers
 * map random host ports while each test module gets a stable config object
 * (no shared `process.env` across parallel workers).
 */
export interface E2EInfraConfig {
  rmqUrl?: string;
  natsServers?: string;
  redis?: { host: string; port: number };
  mqttUrl?: string;
  /** kafkajs broker entry: `host:port` (no protocol) */
  kafkaBrokers?: [string, ...string[]];
}

export const E2E_INFRA: InjectionToken<E2EInfraConfig> = Symbol('E2E_INFRA');
