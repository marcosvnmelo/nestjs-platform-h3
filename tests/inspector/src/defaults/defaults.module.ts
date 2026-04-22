import { Module } from '@nestjs/common';

import { DefaultsService } from './defaults.service.ts';

@Module({
  providers: [DefaultsService],
})
export class DefaultsModule {}
