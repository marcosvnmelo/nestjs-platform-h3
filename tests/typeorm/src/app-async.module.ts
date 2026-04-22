import { Module } from '@nestjs/common';

import { DatabaseModule } from './database.module.ts';
import { PhotoModule } from './photo/photo.module.ts';

@Module({
  imports: [DatabaseModule.forRoot(), PhotoModule],
})
export class AsyncApplicationModule {}
