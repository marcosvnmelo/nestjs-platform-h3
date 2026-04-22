import type { App } from 'supertest/types.d.ts';
import type { StartedTestContainer } from 'testcontainers';
import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AsyncOptionsClassModule } from '../src/async-class-options.module.ts';
import { MongooseOptionsConfigModule } from '../src/mongo-options-config.module.ts';
import {
  mongooseOptions,
  startMongoContainer,
} from './test-infra/containers.ts';

describe('Mongoose', () => {
  let server: App;
  let app: NestH3Application;
  let mongoContainer: StartedTestContainer;

  beforeEach(async () => {
    mongoContainer = await startMongoContainer();
    const options = mongooseOptions(mongoContainer);

    const module = await Test.createTestingModule({
      imports: [
        MongooseOptionsConfigModule.forRoot(options),
        AsyncOptionsClassModule,
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  it(`should return created entity`, async () => {
    const cat = {
      name: 'Nest',
      age: 20,
      breed: 'Awesome',
    };
    await request(server)
      .post('/cats')
      .send(cat)
      .expect(201)
      .expect(({ body }) => body.name === cat.name);
  });

  afterEach(async () => {
    await app.close();
    await mongoContainer.stop();
  });
});
