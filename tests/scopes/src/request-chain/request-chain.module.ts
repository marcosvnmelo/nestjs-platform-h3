import { Module } from '@nestjs/common';

import { HelperModule } from './helper/helper.module.ts';
import { RequestChainController } from './request-chain.controller.ts';
import { RequestChainService } from './request-chain.service.ts';

@Module({
  imports: [HelperModule],
  providers: [RequestChainService],
  controllers: [RequestChainController],
})
export class RequestChainModule {}
