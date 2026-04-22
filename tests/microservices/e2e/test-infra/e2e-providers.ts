import type { Provider } from '@nestjs/common';

import type { E2EInfraConfig } from '../../src/e2e-infra.ts';
import { E2E_INFRA } from '../../src/e2e-infra.ts';

export function e2eInfraProvider(config: E2EInfraConfig): Provider {
  return { provide: E2E_INFRA, useValue: config };
}
