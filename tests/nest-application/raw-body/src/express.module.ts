import { Module } from '@nestjs/common';

import { ExpressController } from './express.controller.ts';

@Module({
  controllers: [ExpressController],
})
export class ExpressModule {}
