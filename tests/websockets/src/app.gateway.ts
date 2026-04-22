import type { Socket } from 'socket.io';
import { throwError } from 'rxjs';

import { UseFilters, UseInterceptors } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';

import { RequestFilter } from './request.filter.ts';
import { RequestInterceptor } from './request.interceptor.ts';

@WebSocketGateway(8080)
export class ApplicationGateway {
  @SubscribeMessage('push')
  onPush(@MessageBody() data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }

  @UseInterceptors(RequestInterceptor)
  @SubscribeMessage('getClient')
  getPathCalled(
    client: Socket & { pattern: string },
    data: Record<string, unknown>,
  ) {
    return {
      event: 'popClient',
      data: { ...data, path: client.pattern },
    };
  }

  @UseFilters(RequestFilter)
  @SubscribeMessage('getClientWithError')
  getPathCalledWithError() {
    return throwError(() => new WsException('This is an error'));
  }
}
