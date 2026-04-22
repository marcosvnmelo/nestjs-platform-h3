import { Module } from '@nestjs/common';

import { HelloController } from './hello.controller.ts';
import { HelloService } from './hello.service.ts';
import { UsersService } from './users/users.service.ts';

@Module({
  controllers: [HelloController],
  providers: [HelloService, UsersService],
})
export class HelloModule {}
