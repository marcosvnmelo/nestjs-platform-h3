import { MiddlewareConsumer, Module } from '@nestjs/common';

import {
  H3ServerRequest,
  H3ServerResponse,
} from '@marcosvnmelo/nestjs-platform-h3';

import { AppV1Controller } from './app-v1.controller.js';
import { AppV2Controller } from './app-v2.controller.js';
import { MiddlewareController } from './middleware.controller.js';
import { MultipleMiddlewareVersionController } from './multiple-middleware.controller.js';
import { MultipleVersionController } from './multiple.controller.js';
import { VersionNeutralMiddlewareController } from './neutral-middleware.controller.js';
import { VersionNeutralController } from './neutral.controller.js';
import { NoVersioningController } from './no-versioning.controller.js';
import { OverridePartialController } from './override-partial.controller.js';
import { OverrideController } from './override.controller.js';

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
