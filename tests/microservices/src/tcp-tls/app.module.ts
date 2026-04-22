import * as fs from 'fs';
import * as path from 'path';

import type { Type } from '@nestjs/common';
import type { ClientOptions } from '@nestjs/microservices';
import { Injectable, Module } from '@nestjs/common';
import {
  ClientProxy,
  ClientsModule,
  ClientsModuleOptionsFactory,
  ClientTCP,
  RpcException,
  Transport,
} from '@nestjs/microservices';

import { AppController } from './app.controller.ts';

const caCert = fs
  .readFileSync(path.join(import.meta.dirname, 'ca.cert.pem'))
  .toString();

class ErrorHandlingProxy extends ClientTCP {
  constructor() {
    super({
      tlsOptions: { ca: caCert },
    });
  }

  serializeError(err: string | object) {
    return new RpcException(err);
  }
}

@Injectable()
class ConfigService {
  private readonly config = {
    transport: Transport.TCP,
  };
  get(_key: 'transport'): Transport {
    return this.config.transport;
  }
}

@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

@Injectable()
class ClientOptionService implements ClientsModuleOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createClientOptions(): Promise<ClientOptions> | ClientOptions {
    return {
      transport: this.configService.get('transport'),
      options: {
        tlsOptions: { ca: caCert },
      },
    } as ClientOptions;
  }
}

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        name: 'USE_FACTORY_CLIENT',
        useFactory: (configService: ConfigService) =>
          ({
            transport: configService.get('transport'),
            options: {
              tlsOptions: { ca: caCert },
            },
          }) as ClientOptions,
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        name: 'USE_CLASS_CLIENT',
        useClass: ClientOptionService,
        inject: [ConfigService],
      },
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: 'CUSTOM_PROXY_CLIENT',
        useFactory: (_config: ConfigService) => ({
          customClass: ErrorHandlingProxy as Type<ClientProxy>,
        }),
      },
    ]),
  ],
  controllers: [AppController],
})
export class ApplicationModule {}
