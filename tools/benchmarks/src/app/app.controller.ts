import { Controller, Get } from '@nestjs/common';

@Controller()
export class BenchmarkController {
  @Get('hello')
  hello() {
    return 'ok';
  }
}
