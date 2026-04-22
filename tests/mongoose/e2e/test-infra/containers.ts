import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';

import type { MongooseModuleOptions } from '@nestjs/mongoose';

export const IMAGES = {
  mongodb: 'mongo:latest',
} as const;

const MONGODB_PORT = 27017;
const MONGODB_DATABASE = 'test';

export function mongooseOptions(
  container: StartedTestContainer,
): MongooseModuleOptions {
  return {
    uri: `mongodb://${container.getHost()}:${container.getMappedPort(MONGODB_PORT)}/${MONGODB_DATABASE}`,
  };
}

export async function startMongoContainer(): Promise<StartedTestContainer> {
  return await new GenericContainer(IMAGES.mongodb)
    .withEnvironment({
      MONGODB_DATABASE,
    })
    .withExposedPorts(MONGODB_PORT)
    .start();
}
