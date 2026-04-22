import type { DynamicModule } from '@nestjs/common';
import type { MongooseModuleOptions } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

import { $MONGOOSE_OPTIONS } from './symbols/mongo-config.symbol.ts';

@Module({})
export class MongooseOptionsConfigModule {
  static forRoot(options: MongooseModuleOptions): DynamicModule {
    return {
      global: true,
      module: MongooseOptionsConfigModule,
      providers: [{ provide: $MONGOOSE_OPTIONS, useValue: options }],
      exports: [$MONGOOSE_OPTIONS],
    };
  }
}
