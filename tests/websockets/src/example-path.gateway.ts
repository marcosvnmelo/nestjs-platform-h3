import type { Socket } from 'socket.io';

import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  path: '/example',
})
export class ExamplePathGateway {
  @SubscribeMessage('push')
  onPush(_client: Socket, data: unknown) {
    return {
      event: 'pop',
      data,
    };
  }
}
