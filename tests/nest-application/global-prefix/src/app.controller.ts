import { Controller, Get, Post, Req } from '@nestjs/common';

import type { GlobalPrefixRequest } from './req.types.ts';

@Controller()
export class AppController {
  @Get('hello/:name')
  getHello(@Req() req: GlobalPrefixRequest): string {
    return 'Hello: ' + req.extras?.data;
  }

  @Get('params')
  getParams(@Req() req: GlobalPrefixRequest): any {
    return req.middlewareParams;
  }

  @Get('health')
  getHealth(): string {
    return 'up';
  }

  @Get('test')
  getTest(): string {
    return 'test';
  }

  @Post('test')
  postTest(): string {
    return 'test';
  }

  @Get()
  getHome(@Req() req: GlobalPrefixRequest) {
    return 'Extras: ' + req.extras?.data + ', Count: ' + req.count;
  }

  @Get('count')
  getCount(@Req() req: GlobalPrefixRequest) {
    return req.count;
  }
}
