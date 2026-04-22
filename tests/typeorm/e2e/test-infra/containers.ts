import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { Photo } from '../../src/photo/photo.entity.ts';

export const IMAGES = {
  mysql: 'mysql:9.7.0',
} as const;

const MYSQL_ROOT_USER = 'root';
const MYSQL_ROOT_PASSWORD = 'root';
const MYSQL_DATABASE = 'test';
const MYSQL_PORT = 3306;

export function typeormOptions(
  container: StartedTestContainer,
): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: container.getHost(),
    port: container.getMappedPort(MYSQL_PORT),
    username: MYSQL_ROOT_USER,
    password: MYSQL_ROOT_PASSWORD,
    database: MYSQL_DATABASE,
    entities: [Photo],
    synchronize: true,
    retryAttempts: 5,
    retryDelay: 2000,
  };
}

export async function startMySqlContainer(): Promise<StartedTestContainer> {
  return await new GenericContainer(IMAGES.mysql)
    .withEnvironment({
      MYSQL_ROOT_PASSWORD,
      MYSQL_DATABASE,
    })
    .withExposedPorts(MYSQL_PORT)
    .withWaitStrategy(Wait.forLogMessage(/port: 3306 {2}MySQL/i))
    .start();
}
