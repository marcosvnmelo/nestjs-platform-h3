import { Module } from '@nestjs/common';

import { HelloController } from './hello.controller.ts';
import { HelloService } from './hello.service.ts';

@Module({
  controllers: [HelloController],
  providers: [HelloService],
})
export class HelloModule {}
