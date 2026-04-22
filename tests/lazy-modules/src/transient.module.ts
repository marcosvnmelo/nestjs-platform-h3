import { Module } from '@nestjs/common';

import { EagerService } from './eager.module.ts';
import { GlobalService } from './global.module.ts';
import { TransientService } from './transient.service.ts';

@Module({
  imports: [],
  providers: [TransientService, GlobalService, EagerService],
  exports: [TransientService],
})
export class TransientLazyModule {}
