import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import type { ClientOptions } from '@nestjs/microservices';
import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  RequestTimeoutException,
} from '@nestjs/common';
import { ClientProxyFactory } from '@nestjs/microservices';

@Controller()
export class DisconnectedClientController {
  @Post()
  call(@Body() options: ClientOptions): Observable<number> {
    const client = ClientProxyFactory.create(options);
    return client.send<number, number[]>({ cmd: 'none' }, [1, 2, 3]).pipe(
      // tap(
      //   console.log.bind(console, 'data'),
      //   console.error.bind(console, 'error'),
      // ),
      catchError((error) => {
        const { code } = error?.err ?? error ?? { code: 'CONN_ERR' };
        return throwError(() =>
          code === 'ECONNREFUSED' ||
          code === 'CONN_ERR' ||
          code === 'ENOTFOUND' ||
          code === 'CONNECTION_REFUSED' ||
          error.message.includes('Connection is closed.') ||
          error.message.includes('connection refused')
            ? new RequestTimeoutException('ECONNREFUSED')
            : new InternalServerErrorException(),
        );
      }),
      tap({
        error: () => client.close(),
      }),
    );
  }
}
