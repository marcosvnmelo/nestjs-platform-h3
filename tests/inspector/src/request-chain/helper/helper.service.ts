import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import type { H3ServerRequest } from '@marcosvnmelo/nestjs-platform-h3';

@Injectable({ scope: Scope.REQUEST })
export class HelperService {
  constructor(@Inject(REQUEST) public readonly request: H3ServerRequest) {}

  public noop() {}
}
