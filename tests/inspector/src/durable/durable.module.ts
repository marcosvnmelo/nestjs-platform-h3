import { Module } from '@nestjs/common';

import { DurableController } from './durable.controller.ts';
import { DurableService } from './durable.service.ts';

@Module({
  controllers: [DurableController],
  providers: [DurableService],
})
export class DurableModule {}
