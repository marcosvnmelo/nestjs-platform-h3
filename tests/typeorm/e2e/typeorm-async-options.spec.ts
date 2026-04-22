import type { App } from 'supertest/types.d.ts';
import type { StartedTestContainer } from 'testcontainers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AsyncOptionsFactoryModule } from '../src/async-options.module.ts';
import { TypeOrmOptionsConfigModule } from '../src/typeorm-options-config.module.ts';
import {
  startMySqlContainer,
  typeormOptions,
} from './test-infra/containers.ts';

describe.sequential('TypeOrm (async configuration)', () => {
  let server: App;
  let app: NestH3Application;
  let mysqlContainer: StartedTestContainer;

  beforeAll(async () => {
    mysqlContainer = await startMySqlContainer();
  }, 200_000);

  beforeEach(async () => {
    const options = typeormOptions(mysqlContainer);

    const module = await Test.createTestingModule({
      imports: [
        TypeOrmOptionsConfigModule.forRoot(options),
        AsyncOptionsFactoryModule,
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  it(`should return created entity`, async () => {
    await request(server)
      .post('/photo')
      .expect(201, { name: 'Nest', description: 'Is great!', views: 6000 });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await mysqlContainer.stop();
  });
});
