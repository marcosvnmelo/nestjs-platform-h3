import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CatsController } from '../cats/cats.controller.ts';
import { LoggerMiddleware } from '../common/middleware/logger.middleware.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.ts';
import { TransformInterceptor } from './interceptors/transform.interceptor.ts';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(CatsController);
  }
}
