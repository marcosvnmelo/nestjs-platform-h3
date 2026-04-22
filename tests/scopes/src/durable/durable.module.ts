import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { DurableController } from './durable.controller.ts';
import { DurableGuard } from './durable.guard.ts';
import { DurableService } from './durable.service.ts';
import { NonDurableService } from './non-durable.service.ts';

@Module({
  controllers: [DurableController],
  providers: [
    DurableService,
    NonDurableService,
    {
      provide: APP_GUARD,
      useClass: DurableGuard,
    },
  ],
})
export class DurableModule {}
