import { Module } from '@nestjs/common';

import { DogsController } from './dogs.controller.ts';
import { DogsService } from './dogs.service.ts';

@Module({
  controllers: [DogsController],
  providers: [DogsService],
})
export class DogsModule {}
