import { Observable } from 'rxjs';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class Guard implements CanActivate {
  static COUNTER = 0;
  constructor() {
    Guard.COUNTER++;
  }

  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
