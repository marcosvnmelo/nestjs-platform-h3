import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { Guard } from './guards/request-scoped.guard.ts';
import { HelloService } from './hello.service.ts';
import { Interceptor } from './interceptors/logging.interceptor.ts';
import { UsersService } from './users/users.service.ts';

@Controller()
export class HelloController {
  static COUNTER = 0;
  constructor(
    private readonly helloService: HelloService,
    // @ts-expect-error - unused on original code
    private readonly usersService: UsersService,
  ) {
    HelloController.COUNTER++;
  }

  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @MessagePattern('test')
  greeting(): string {
    return this.helloService.greeting();
  }
}
