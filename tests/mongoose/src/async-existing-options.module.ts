import type {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Inject, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatsModule } from './cats/cats.module.ts';
import { $MONGOOSE_OPTIONS } from './symbols/mongo-config.symbol.ts';

class ConfigService implements MongooseOptionsFactory {
  constructor(
    @Inject($MONGOOSE_OPTIONS)
    private readonly mongooseOptions: MongooseModuleOptions,
  ) {}

  createMongooseOptions(): MongooseModuleOptions {
    return this.mongooseOptions;
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useExisting: ConfigService,
    }),
    CatsModule,
  ],
})
export class AsyncOptionsExistingModule {}
