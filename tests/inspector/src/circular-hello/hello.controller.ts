import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { Guard } from './guards/request-scoped.guard.ts';
import { HelloService } from './hello.service.ts';
import { Interceptor } from './interceptors/logging.interceptor.ts';
import { UserByIdPipe } from './users/user-by-id.pipe.js';
import { UsersService } from './users/users.service.ts';

@Controller('hello')
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
  @Get()
  greeting(@Param('id', UserByIdPipe) _id: string): string {
    return this.helloService.greeting();
  }
}
