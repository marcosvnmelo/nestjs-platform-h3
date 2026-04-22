import { Module } from '@nestjs/common';

import { CatsController } from './cats.controller.ts';
import { CatsService } from './cats.service.ts';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
