import { Logger, Module } from '@nestjs/common';

import { HelloRequestService } from './hello-request/hello-request.service.ts';
import { RequestLogger } from './hello-request/request-logger.service.ts';
import { HelloTransientService } from './hello-transient/hello-transient.service.ts';
import { TransientLogger } from './hello-transient/transient-logger.service.ts';
import { HelloController } from './hello.controller.ts';

@Module({
  controllers: [HelloController],
  providers: [
    HelloRequestService,
    HelloTransientService,
    RequestLogger,
    TransientLogger,
    Logger,
  ],
})
export class HelloModule {}
