import { Module } from '@nestjs/common';

import { EagerService } from './eager.module.ts';
import { GlobalService } from './global.module.ts';
import { RequestService } from './request.service.ts';

@Module({
  imports: [],
  providers: [RequestService, GlobalService, EagerService],
  exports: [RequestService],
})
export class RequestLazyModule {}
