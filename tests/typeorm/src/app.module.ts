import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Photo } from './photo/photo.entity.ts';
import { PhotoModule } from './photo/photo.module.ts';

@Module({
  imports: [PhotoModule],
})
export class ApplicationModule {}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test',
      entities: [Photo],
      synchronize: true,
      retryAttempts: 2,
      retryDelay: 1000,
    }),
    ApplicationModule,
  ],
})
export class AppModule {}
