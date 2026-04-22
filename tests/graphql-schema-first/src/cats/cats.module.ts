import { DynamicModule, Module, Scope } from '@nestjs/common';

import { CatsRequestScopedService } from './cats-request-scoped.service.ts';
import { CatsResolvers } from './cats.resolvers.js';
import { CatsService } from './cats.service.ts';

@Module({
  providers: [CatsService, CatsResolvers],
})
export class CatsModule {
  static enableRequestScope(): DynamicModule {
    return {
      module: CatsModule,
      providers: [
        {
          provide: CatsService,
          useClass: CatsRequestScopedService,
          scope: Scope.REQUEST,
        },
      ],
    };
  }
}
