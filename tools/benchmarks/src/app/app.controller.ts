import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

@Controller()
export class BenchmarkController {
  @Get('hello')
  hello() {
    return 'ok';
  }

  @Post('all/:path')
  all(
    @Param() params: string[],
    @Query() query: Record<string, string>,
    @Body() body: Record<string, string>,
  ) {
    return { params, query, body };
  }
}
