import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class HelloService {
  // @ts-expect-error - unused on original code
  constructor(@Inject('META') private readonly meta) {}

  greeting(): string {
    return 'Hello world!';
  }
}
