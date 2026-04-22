import { Injectable, Scope } from '@nestjs/common';

import { LoggerService } from './logger.service.ts';

@Injectable({ scope: Scope.REQUEST })
export class RequestLoggerService {
  constructor(public loggerService: LoggerService) {}
}
