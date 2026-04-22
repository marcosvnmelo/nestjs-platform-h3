import type { DynamicModule } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { $TYPEORM_OPTIONS } from './symbols/typeorm-config.symbol.ts';

@Module({})
export class TypeOrmOptionsConfigModule {
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {
    return {
      global: true,
      module: TypeOrmOptionsConfigModule,
      providers: [{ provide: $TYPEORM_OPTIONS, useValue: options }],
      exports: [$TYPEORM_OPTIONS],
    };
  }
}
