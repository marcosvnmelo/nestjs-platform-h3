import type { ErrorPayload } from '@nestjs/websockets';
import { IntrinsicException, Logger } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils.js';
import { MESSAGES } from '@nestjs/core/constants.js';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

type CauseHost = { pattern: string; data: unknown } | undefined;
type NativeErrorPayload = ErrorPayload<Record<string, any>>;

/**
 * BaseWsExceptionFilter uses client.emit (Socket.IO). Native `ws` has EventEmitter.emit
 * (local only) — wire errors with send(JSON) matching platform-ws message shape.
 * @see https://github.com/nestjs/nest/pull/16336
 */
function isNativeWsClient(
  client: unknown,
): client is { send: (data: string) => void; readyState: number } {
  return (
    typeof client === 'object' &&
    client !== null &&
    typeof (client as { send?: unknown }).send === 'function' &&
    typeof (client as { readyState?: unknown }).readyState === 'number'
  );
}

function deliverException(client: any, payload: unknown) {
  if (isNativeWsClient(client)) {
    client.send(
      JSON.stringify({
        event: 'exception',
        data: payload,
      }),
    );
    return;
  }
  client.emit('exception', payload);
}

export class NativeWebSocketExceptionFilter extends BaseWsExceptionFilter {
  handleError(client: any, exception: unknown, cause: CauseHost) {
    if (!(exception instanceof WsException)) {
      this.handleUnknownError(exception, client, cause);
      return;
    }
    const status = 'error' as const;
    const result = exception.getError();
    if (isObject(result)) {
      deliverException(client, result);
      return;
    }
    const payload: NativeErrorPayload = {
      status,
      message: result as string,
    };
    if (this.options?.includeCause && cause) {
      payload.cause = this.options.causeFactory?.(cause.pattern, cause.data);
    }
    deliverException(client, payload);
  }

  handleUnknownError(exception: unknown, client: any, data: CauseHost) {
    const payload: NativeErrorPayload = {
      status: 'error',
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };
    if (this.options?.includeCause && data) {
      payload.cause = this.options.causeFactory?.(data.pattern, data.data);
    }
    deliverException(client, payload);
    if (!(exception instanceof IntrinsicException)) {
      logger.error(exception);
    }
  }
}

const logger = new Logger('NativeWebSocketExceptionFilter');
