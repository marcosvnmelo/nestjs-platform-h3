import { from, lastValueFrom, Observable, of } from 'rxjs';
import { scan } from 'rxjs/operators';

import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Optional,
  Post,
  Query,
} from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  EventPattern,
  MessagePattern,
  Transport,
} from '@nestjs/microservices';

import type { E2EInfraConfig } from '../e2e-infra.ts';
import { E2E_INFRA } from '../e2e-infra.ts';

@Controller()
export class RedisController {
  static IS_NOTIFIED = false;

  client: ClientProxy;

  constructor(@Optional() @Inject(E2E_INFRA) e2e?: E2EInfraConfig) {
    this.client = ClientProxyFactory.create({
      transport: Transport.REDIS,
      options: {
        host: e2e?.redis?.host ?? 'localhost',
        port: e2e?.redis?.port ?? 6379,
      },
    });
  }

  @Post()
  @HttpCode(200)
  call(
    @Query('command') cmd: string,
    @Body() data: number[],
  ): Observable<number> {
    return this.client.send<number>({ cmd }, data);
  }

  @Post('stream')
  @HttpCode(200)
  stream(@Body() data: number[]): Observable<number> {
    return this.client
      .send<number>({ cmd: 'streaming' }, data)
      .pipe(scan((a, b) => a + b));
  }

  @Post('concurrent')
  @HttpCode(200)
  concurrent(@Body() data: number[][]): Promise<boolean> {
    const send = async (tab: number[]) => {
      const expected = tab.reduce((a, b) => a + b);
      const result = await lastValueFrom(
        this.client.send<number>({ cmd: 'sum' }, tab),
      );

      return result === expected;
    };
    return data
      .map(async (tab) => send(tab))
      .reduce(async (a, b) => (await a) && b);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'asyncSum' })
  async asyncSum(data: number[]): Promise<number> {
    return (data || []).reduce((a, b) => a + b);
  }

  @MessagePattern({ cmd: 'streamSum' })
  streamSum(data: number[]): Observable<number> {
    return of((data || []).reduce((a, b) => a + b));
  }

  @MessagePattern({ cmd: 'streaming' })
  streaming(data: number[]): Observable<number> {
    return from(data);
  }

  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit<number>('notification', true);
  }

  @EventPattern('notification')
  eventHandler(data: boolean) {
    RedisController.IS_NOTIFIED = data;
  }
}
