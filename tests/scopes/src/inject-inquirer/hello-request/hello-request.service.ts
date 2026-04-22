import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

import { RequestLogger } from './request-logger.service.ts';

@Injectable({ scope: Scope.REQUEST })
export class HelloRequestService {
  static logger = { feature: 'request' };

  constructor(
    private readonly logger: RequestLogger,
    // @ts-expect-error INQUIRER used by Nest; unused in this service
    @Inject(INQUIRER) private readonly _inquirer: unknown,
  ) {}

  greeting() {
    this.logger.log('Hello request!');
  }

  farewell() {
    this.logger.log('Goodbye request!');
  }
}
