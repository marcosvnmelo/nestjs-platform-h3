import { afterEach, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import {
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { H3Adapter, NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from '../src/app.module.ts';

@Injectable()
export class AuthGuard {
  canActivate() {
    const x = true;
    if (x) {
      throw new UnauthorizedException();
    }
  }
}

function createTestModule(guard: AuthGuard) {
  return Test.createTestingModule({
    imports: [AppModule],
    providers: [
      {
        provide: APP_GUARD,
        useValue: guard,
      },
    ],
  }).compile();
}

describe('Guards', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it(`should prevent access (unauthorized)`, async () => {
    app = (
      await createTestModule(new AuthGuard())
    ).createNestApplication<NestH3Application>(new H3Adapter());

    await app.init();
    await request(app.getHttpServer())
      .get('/hello')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Unauthorized');
        expect(body.statusCode).toBe(401);
      });
  });

  it(`should allow access when guard returns true`, async () => {
    const allowGuard = { canActivate: () => true };
    app = (
      await createTestModule(allowGuard)
    ).createNestApplication<NestH3Application>(new H3Adapter());

    await app.init();
    await request(app.getHttpServer())
      .get('/hello')
      .expect(200)
      .expect('Hello world!');
  });
});
