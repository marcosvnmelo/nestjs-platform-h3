import { lastValueFrom, Observable } from 'rxjs';

import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  Post,
} from '@nestjs/common';
import {
  ClientKafka,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

import type { E2EInfraConfig } from '../e2e-infra.ts';
import { E2E_INFRA } from '../e2e-infra.ts';
import { BusinessDto } from './dtos/business.dto.ts';
import { UserDto } from './dtos/user.dto.ts';

@Controller()
export class KafkaController implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(KafkaController.name);
  static IS_NOTIFIED = false;
  static MATH_SUM = 0;

  private readonly client: ClientKafka;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    const brokers: [string, ...string[]] = e2e?.kafkaBrokers?.length
      ? e2e.kafkaBrokers
      : ['localhost:9092'];
    this.client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: {
          brokers,
          // retry: { retries: 10, initialRetryTime: 200, maxRetryTime: 5000 },
        },
        // producer: { metadataMaxAge: 60_000 },
      },
    }) as ClientKafka;
  }

  async onModuleInit() {
    const requestPatterns = [
      'math.sum.sync.kafka.message',
      'math.sum.sync.without.key',
      'math.sum.sync.plain.object',
      'math.sum.sync.array',
      'math.sum.sync.string',
      'math.sum.sync.number',
      'user.create',
      'business.create',
    ];

    requestPatterns.forEach((pattern) => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  // sync send kafka message
  @Post('mathSumSyncKafkaMessage')
  @HttpCode(200)
  async mathSumSyncKafkaMessage(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.kafka.message', {
        key: '1',
        value: {
          numbers: data,
        },
      }),
    );
    return result;
  }

  // sync send kafka(ish) message without key and only the value
  @Post('mathSumSyncWithoutKey')
  @HttpCode(200)
  async mathSumSyncWithoutKey(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.without.key', {
        value: {
          numbers: data,
        },
      }),
    );
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncPlainObject')
  @HttpCode(200)
  async mathSumSyncPlainObject(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.plain.object', {
        numbers: data,
      }),
    );
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncArray')
  @HttpCode(200)
  async mathSumSyncArray(@Body() data: number[]): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.array', data),
    );
    return result;
  }

  @Post('mathSumSyncString')
  @HttpCode(200)
  async mathSumSyncString(@Body() data: number[]): Promise<Observable<any>> {
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.string', data.toString()),
    );
    return result;
  }

  @Post('mathSumSyncNumber')
  @HttpCode(200)
  async mathSumSyncNumber(@Body() data: number[]): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.number', data[0]),
    );
    return result;
  }

  // async notify
  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit('notify', { notify: true });
  }

  // Complex data to send.
  @Post('/user')
  @HttpCode(200)
  async createUser(@Body() user: UserDto): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('user.create', {
        key: '1',
        value: {
          user,
        },
      }),
    );
    return result;
  }

  // Complex data to send.
  @Post('/business')
  @HttpCode(200)
  async createBusiness(@Body() business: BusinessDto) {
    const result = await lastValueFrom(
      this.client.send('business.create', {
        key: '1',
        value: {
          business,
        },
      }),
    );
    return result;
  }
}
