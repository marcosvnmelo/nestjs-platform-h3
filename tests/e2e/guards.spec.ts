import { afterEach, beforeEach, describe, it } from '@rstest/core';
import request from 'supertest';

import { Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AuthGuard } from '../src/guards/auth.guard';
import { Roles, RolesGuard } from '../src/guards/roles.guard';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'success';
  }

  @Get('roles')
  @Roles('admin')
  rolesProtected() {
    return 'admin-only';
  }
}

describe('Guards (H3 adapter)', () => {
  describe('AuthGuard', () => {
    let app: NestH3Application;

    it('should allow access when guard returns true', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: new AuthGuard(true),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');
    });

    it('should prevent access when guard returns false', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: new AuthGuard(false),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      // Without authorization header, should fail
      await request(app.getHttpServer()).get('/test').expect(403);
    });

    it('should allow access with authorization header when required', async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_GUARD,
            useValue: new AuthGuard(false),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .set('Authorization', 'Bearer token')
        .expect(200)
        .expect('success');
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });
  });

  describe('RolesGuard', () => {
    let app: NestH3Application;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_GUARD,
            useClass: RolesGuard,
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should allow access to unprotected routes', async () => {
      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');
    });

    it('should allow access when user has required role', async () => {
      await request(app.getHttpServer())
        .get('/test/roles')
        .set('X-User-Roles', 'admin')
        .expect(200)
        .expect('admin-only');
    });

    it('should deny access when user lacks required role', async () => {
      await request(app.getHttpServer())
        .get('/test/roles')
        .set('X-User-Roles', 'user')
        .expect(403);
    });

    it('should deny access when no roles provided', async () => {
      await request(app.getHttpServer()).get('/test/roles').expect(403);
    });
  });
});
