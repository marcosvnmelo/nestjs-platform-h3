import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { Guard } from './guards/request-scoped.guard.ts';
import { Interceptor } from './interceptors/logging.interceptor.ts';
import { UserByIdPipe } from './users/user-by-id.pipe.js';

@Controller('test')
export class TestController {
  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @Get()
  greeting(@Param('id', UserByIdPipe) _id: string): string {
    return 'hey';
  }
}
