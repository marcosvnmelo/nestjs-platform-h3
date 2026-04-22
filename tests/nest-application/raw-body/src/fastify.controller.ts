import type { FastifyRequest } from 'fastify';

import type { RawBodyRequest } from '@nestjs/common';
import { Controller, Post, Req } from '@nestjs/common';

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<FastifyRequest>) {
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
