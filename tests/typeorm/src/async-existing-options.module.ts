import type {
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory,
} from '@nestjs/typeorm';
import { Inject, Injectable, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhotoModule } from './photo/photo.module.ts';
import { $TYPEORM_OPTIONS } from './symbols/typeorm-config.symbol.ts';

@Injectable()
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
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useExisting: ConfigService,
    }),
    PhotoModule,
  ],
})
export class AsyncOptionsExistingModule {}
