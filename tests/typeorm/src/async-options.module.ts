import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoModule } from './photo/photo.module.ts';
import { $TYPEORM_OPTIONS } from './symbols/typeorm-config.symbol.ts';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (options: TypeOrmModuleOptions) => options,
      inject: [$TYPEORM_OPTIONS],
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsFactoryModule {}
