import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';

import {
  H3ServerResponse,
  PolyfilledResponse,
} from '@marcosvnmelo/nestjs-platform-h3';

import type { GlobalPrefixRequest } from './req.types.ts';
import { AppController } from './app.controller.ts';

export const MIDDLEWARE_VALUE = 'middleware';
export const MIDDLEWARE_PARAM_VALUE = 'middleware_param';

@Module({
  controllers: [AppController],
})
export class AppModule {
  private count = 0;
  configure(consumer: MiddlewareConsumer) {
    const jsonMw = (
      _req: GlobalPrefixRequest,
      res: PolyfilledResponse<H3ServerResponse>,
      _next: () => void,
    ) => res.end(MIDDLEWARE_VALUE);
    const jsonMw201 = (
      _req: GlobalPrefixRequest,
      res: PolyfilledResponse<H3ServerResponse>,
      _next: () => void,
    ) => res.status(201).end(MIDDLEWARE_VALUE);
    const paramMw = (
      _req: GlobalPrefixRequest,
      res: PolyfilledResponse<H3ServerResponse>,
      _next: () => void,
    ) => res.end(MIDDLEWARE_PARAM_VALUE);
    const paramMw201 = (
      _req: GlobalPrefixRequest,
      res: PolyfilledResponse<H3ServerResponse>,
      _next: () => void,
    ) => res.status(201).end(MIDDLEWARE_PARAM_VALUE);
    const attachExtras = (
      req: GlobalPrefixRequest,
      _res: PolyfilledResponse<H3ServerResponse>,
      next: () => void,
    ) => {
      req.extras = { data: 'Data attached in middleware' };
      next();
    };
    const copyParams = (
      req: GlobalPrefixRequest,
      _res: PolyfilledResponse<H3ServerResponse>,
      next: () => void,
    ) => {
      req.middlewareParams = req.params;
      next();
    };
    const countMw = (
      req: GlobalPrefixRequest,
      _res: PolyfilledResponse<H3ServerResponse>,
      next: () => void,
    ) => {
      this.count += 1;
      req.count = this.count;
      next();
    };

    consumer
      .apply(jsonMw)
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.GET })
      .apply(jsonMw201)
      .forRoutes({ path: MIDDLEWARE_VALUE, method: RequestMethod.POST })
      .apply(paramMw)
      .forRoutes({
        path: MIDDLEWARE_VALUE + '/*path',
        method: RequestMethod.GET,
      })
      .apply(paramMw201)
      .forRoutes({
        path: MIDDLEWARE_VALUE + '/*path',
        method: RequestMethod.POST,
      })
      .apply(attachExtras)
      .forRoutes({ path: '*path', method: RequestMethod.GET })
      .apply(copyParams)
      .forRoutes({ path: '*path', method: RequestMethod.GET })
      .apply(countMw)
      .forRoutes('*path');
  }
}
