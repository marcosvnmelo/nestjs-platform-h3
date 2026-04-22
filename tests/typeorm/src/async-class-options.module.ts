import type {
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory,
} from '@nestjs/typeorm';
import { Inject, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoModule } from './photo/photo.module.ts';
import { $TYPEORM_OPTIONS } from './symbols/typeorm-config.symbol.ts';

class ConfigService implements TypeOrmOptionsFactory {
  constructor(
    @Inject($TYPEORM_OPTIONS)
    private readonly typeOrmOptions: TypeOrmModuleOptions,
  ) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return this.typeOrmOptions;
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useClass: ConfigService,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsClassModule {}
