import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(_req: any, _res: any, next: () => void) {
    console.log(`Request...`);
    next();
  }
}
