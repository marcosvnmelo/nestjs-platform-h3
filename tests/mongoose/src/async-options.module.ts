import type { MongooseModuleOptions } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatsModule } from './cats/cats.module.ts';
import { $MONGOOSE_OPTIONS } from './symbols/mongo-config.symbol.ts';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (options: MongooseModuleOptions) => options,
      inject: [$MONGOOSE_OPTIONS],
    }),
    CatsModule,
  ],
})
export class AsyncOptionsFactoryModule {}
