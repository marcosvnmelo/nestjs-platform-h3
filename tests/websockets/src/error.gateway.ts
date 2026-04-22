import { throwError } from 'rxjs';

import {
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';

@WebSocketGateway(8080)
export class ErrorGateway {
  @SubscribeMessage('push')
  onPush() {
    return throwError(() => new WsException('test'));
  }
}
