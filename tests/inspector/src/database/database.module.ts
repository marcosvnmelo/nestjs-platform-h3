import { Module } from '@nestjs/common';

import { DatabaseController } from './database.controller.ts';
import { DatabaseService } from './database.service.ts';

@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService],
})
export class DatabaseModule {}
