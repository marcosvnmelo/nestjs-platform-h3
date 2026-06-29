import type { RawBodyRequest } from '@nestjs/common';
import { Controller, Post, Req } from '@nestjs/common';

import type {
  H3ServerRequest,
  PolyfilledRequest,
} from '@marcosvnmelo/nestjs-platform-h3';

@Controller()
export class FastifyController {
  @Post()
  getRawBody(@Req() req: RawBodyRequest<PolyfilledRequest<H3ServerRequest>>) {
    return {
      parsed: req.body,
      raw: req.rawBody!.toString(),
    };
  }
}
