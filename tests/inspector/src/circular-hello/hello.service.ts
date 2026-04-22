import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  static COUNTER = 0;
  // @ts-expect-error - unused on original code
  constructor(@Inject('META') private readonly meta) {
    HelloService.COUNTER++;
  }

  greeting(): string {
    return 'Hello world!';
  }
}
