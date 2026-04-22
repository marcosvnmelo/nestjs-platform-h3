import type { IncomingMessage } from 'http';

import type { RawBodyRequest } from '@nestjs/common';
import { Controller, Post, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Post()
  index(@Req() req: RawBodyRequest<IncomingMessage>) {
    return {
      raw: req.rawBody?.toString(),
    };
  }
}
