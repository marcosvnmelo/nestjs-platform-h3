import { MiddlewareConsumer, Module } from '@nestjs/common';

import {
  H3ServerRequest,
  H3ServerResponse,
} from '@marcosvnmelo/nestjs-platform-h3';

import { AppV1Controller } from './app-v1.controller.ts';
import { AppV2Controller } from './app-v2.controller.ts';
import { MiddlewareController } from './middleware.controller.ts';
import { MultipleMiddlewareVersionController } from './multiple-middleware.controller.ts';
import { MultipleVersionController } from './multiple.controller.ts';
import { VersionNeutralMiddlewareController } from './neutral-middleware.controller.ts';
import { VersionNeutralController } from './neutral.controller.ts';
import { NoVersioningController } from './no-versioning.controller.ts';
import { OverridePartialController } from './override-partial.controller.ts';
import { OverrideController } from './override.controller.ts';

@Module({
  imports: [],
  controllers: [
    AppV1Controller,
    AppV2Controller,
    MultipleVersionController,
    NoVersioningController,
    VersionNeutralController,
    OverrideController,
    OverridePartialController,
    MiddlewareController,
    MultipleMiddlewareVersionController,
    VersionNeutralMiddlewareController,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((_req: H3ServerRequest, res: H3ServerResponse) =>
        res.end('Hello from middleware function!'),
      )
      .forRoutes(
        MiddlewareController,
        MultipleMiddlewareVersionController,
        VersionNeutralMiddlewareController,
      );
  }
}
