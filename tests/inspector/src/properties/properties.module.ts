import { Module } from '@nestjs/common';

import { DependencyService } from './dependency.service.ts';
import { PropertiesService, SYMBOL_TOKEN } from './properties.service.ts';

@Module({
  providers: [
    DependencyService,
    PropertiesService,
    {
      provide: 'token',
      useValue: true,
    },
    {
      provide: SYMBOL_TOKEN,
      useValue: true,
    },
  ],
})
export class PropertiesModule {}
