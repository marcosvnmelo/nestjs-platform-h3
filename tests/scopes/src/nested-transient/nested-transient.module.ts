import { Module } from '@nestjs/common';

import { FirstRequestService } from './first-request.service.ts';
import { NestedTransientController } from './nested-transient.controller.ts';
import { NestedTransientService } from './nested-transient.service.ts';
import { SecondRequestService } from './second-request.service.ts';
import { TransientLoggerService } from './transient-logger.service.ts';

@Module({
  controllers: [NestedTransientController],
  providers: [
    FirstRequestService,
    SecondRequestService,
    TransientLoggerService,
    NestedTransientService,
  ],
})
export class NestedTransientModule {}
