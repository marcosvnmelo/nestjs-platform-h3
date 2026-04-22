import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern } from '@nestjs/microservices';

import { BusinessDto } from './dtos/business.dto.ts';
import { UserDto } from './dtos/user.dto.ts';
import { BusinessEntity } from './entities/business.entity.ts';
import { UserEntity } from './entities/user.entity.ts';
import { KafkaController } from './kafka.controller.ts';

/** Decoded Kafka message `value` (Nest passes `value` field, not the outer `client.send` wrapper). */
function sumNumbersFromPayload(data: any): number[] {
  if (data == null) {
    return [];
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (
    typeof data === 'object' &&
    Array.isArray((data as { numbers?: number[] }).numbers)
  ) {
    return (data as { numbers: number[] }).numbers;
  }
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return sumNumbersFromPayload((data as { value: unknown }).value);
  }
  return [];
}

@Controller()
export class KafkaMessagesController {
  protected readonly logger = new Logger(KafkaMessagesController.name);
  static IS_NOTIFIED = false;

  @MessagePattern('math.sum.sync.kafka.message')
  mathSumSyncKafkaMessage(data: any) {
    return sumNumbersFromPayload(data).reduce(
      (a: number, b: number) => a + b,
      0,
    );
  }

  @MessagePattern('math.sum.sync.without.key')
  mathSumSyncWithoutKey(data: any) {
    return sumNumbersFromPayload(data).reduce(
      (a: number, b: number) => a + b,
      0,
    );
  }

  @MessagePattern('math.sum.sync.plain.object')
  mathSumSyncPlainObject(data: any) {
    return sumNumbersFromPayload(data).reduce(
      (a: number, b: number) => a + b,
      0,
    );
  }

  @MessagePattern('math.sum.sync.array')
  mathSumSyncArray(data: any) {
    const arr = sumNumbersFromPayload(data);
    return arr.reduce((a: number, b: number) => a + b, 0);
  }

  @MessagePattern('math.sum.sync.string')
  mathSumSyncString(data: any) {
    const raw = typeof data === 'string' ? data : String(data ?? '');
    return raw
      .split(',')
      .map((i: string) => parseFloat(i))
      .reduce((a: number, b: number) => a + b, 0);
  }

  @MessagePattern('math.sum.sync.number')
  mathSumSyncNumber(data: any) {
    const n = typeof data === 'number' ? data : Number(data);
    return String(n)
      .split('')
      .map((i: string) => parseFloat(i))
      .reduce((a: number, b: number) => a + b, 0);
  }

  @EventPattern('notify')
  eventHandler(data: any) {
    const payload = data?.value !== undefined ? data.value : data;
    KafkaController.IS_NOTIFIED = payload?.notify === true;
  }

  // Complex data to send.
  @MessagePattern('user.create')
  async createUser(data: any) {
    const user: UserDto | undefined = data?.user ?? data?.value?.user;
    if (!user) {
      throw new Error('user.create: missing user in payload');
    }
    return new UserEntity(user);
  }

  @MessagePattern('business.create')
  async createBusiness(data: any) {
    const business: BusinessDto | undefined =
      data?.business ?? data?.value?.business;
    if (!business) {
      throw new Error('business.create: missing business in payload');
    }
    return new BusinessEntity(business);
  }
}
