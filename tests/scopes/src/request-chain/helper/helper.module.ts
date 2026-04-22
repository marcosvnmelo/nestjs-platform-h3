import { Module } from '@nestjs/common';

import { HelperService } from './helper.service.ts';

@Module({
  providers: [HelperService],
  exports: [HelperService],
})
export class HelperModule {}
