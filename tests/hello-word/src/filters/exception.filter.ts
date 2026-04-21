import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

import type {
  H3ServerResponse,
  PolyfilledResponse,
} from '@marcosvnmelo/nestjs-platform-h3';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<PolyfilledResponse<H3ServerResponse>>();
    const status = exception.getStatus();

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      custom: true,
    };

    // Express-like
    response.status(status).json(body);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<PolyfilledResponse<H3ServerResponse>>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';

    const body = {
      statusCode: status,
      message,
      allExceptionsFilter: true,
    };

    // Express-like
    response.status(status).json(body);
  }
}
