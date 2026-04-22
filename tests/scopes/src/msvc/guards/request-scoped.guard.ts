import { Observable } from 'rxjs';

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class Guard implements CanActivate {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [] as number[];

  constructor(@Inject('REQUEST_ID') private readonly requestId: number) {
    Guard.COUNTER++;
  }

  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    Guard.REQUEST_SCOPED_DATA.push(this.requestId);
    return true;
  }
}
