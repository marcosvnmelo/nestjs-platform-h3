import { Module } from '@nestjs/common';

import { HelloModule } from './hello/hello.module.ts';

@Module({
  imports: [HelloModule],
})
export class AppModule {}
