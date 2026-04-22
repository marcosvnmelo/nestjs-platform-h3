import { Module } from '@nestjs/common';

import { ExternalSvcController } from './external-svc.controller.ts';
import { ExternalSvcService } from './external-svc.service.ts';

@Module({
  controllers: [ExternalSvcController],
  providers: [ExternalSvcService],
})
export class ExternalSvcModule {}
