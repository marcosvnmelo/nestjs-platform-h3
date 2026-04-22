import { PartitionerArgs } from 'kafkajs';
import { Observable } from 'rxjs';

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
import { SumDto } from './dto/sum.dto.ts';

/**
 * The following function explicitly sends messages to the key representing the partition.
 */
const explicitPartitioner = () => {
  return ({ message }: PartitionerArgs) => {
    return parseFloat(message.headers!.toPartition!.toString());
  };
};

@Controller()
export class KafkaConcurrentController
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger = new Logger(KafkaConcurrentController.name);

  public readonly client: ClientKafka;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    const brokers: [string, ...string[]] = e2e?.kafkaBrokers?.length
      ? e2e.kafkaBrokers
      : ['localhost:9092'];
    this.client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: { brokers },
        run: {
          partitionsConsumedConcurrently: 3,
        },
        producer: {
          createPartitioner: explicitPartitioner,
        },
      },
    }) as ClientKafka;
  }

  async onModuleInit() {
    const requestPatterns = ['math.sum.sync.number.wait'];

    requestPatterns.forEach((pattern) => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  @Post('mathSumSyncNumberWait')
  @HttpCode(200)
  public mathSumSyncNumberWait(@Body() data: SumDto): Observable<string> {
    return this.client.send('math.sum.sync.number.wait', {
      headers: {
        toPartition: data.key.toString(),
      },
      key: data.key.toString(),
      value: data.numbers,
    });
  }
}
