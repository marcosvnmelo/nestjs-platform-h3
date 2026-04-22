import { throwError } from 'rxjs';

import { UseFilters } from '@nestjs/common';
import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';

import { NativeWebSocketExceptionFilter } from './native-ws-exception.filter.ts';

@WebSocketGateway(8085)
@UseFilters(new NativeWebSocketExceptionFilter())
export class WsErrorGateway {
  @SubscribeMessage('push')
  onPush() {
    return throwError(() => new WsException('test'));
  }
}
