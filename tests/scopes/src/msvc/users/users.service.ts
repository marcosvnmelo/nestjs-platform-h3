import { Inject, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  static COUNTER = 0;
  // @ts-expect-error - unused on original code
  constructor(@Inject('META') private readonly meta) {
    UsersService.COUNTER++;
  }

  findById(id: string) {
    return { id };
  }
}
