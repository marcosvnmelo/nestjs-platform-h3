import type { DynamicModule } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { $TYPEORM_OPTIONS } from './symbols/typeorm-config.symbol.ts';

@Module({})
export class DatabaseModule {
  static async forRoot(): Promise<DynamicModule> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: (options: TypeOrmModuleOptions) => options,
          inject: [$TYPEORM_OPTIONS],
        }),
      ],
    };
  }
}
