import { interval, map, Observable } from 'rxjs';

import { Controller, MessageEvent, Sse } from '@nestjs/common';

@Controller()
export class AppController {
  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(
      map(() => ({ data: { hello: 'world' } }) as MessageEvent),
    );
  }
}
