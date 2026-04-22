import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import type { TenantContext } from './durable-context-id.strategy.js';

@Injectable()
export class NonDurableService {
  constructor(
    @Inject(REQUEST) private readonly requestPayload: TenantContext,
  ) {}

  getTenantId() {
    return this.requestPayload.tenantId;
  }
}
