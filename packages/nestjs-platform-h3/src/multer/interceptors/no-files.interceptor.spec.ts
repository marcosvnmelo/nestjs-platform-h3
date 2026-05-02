import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { of } from 'rxjs';

import type { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import { setH3Event } from '../../adapters/utils/h3-event.utils.ts';
import * as multipartUtils from '../multer/multipart.utils.ts';
import { NoFilesInterceptor } from './no-files.interceptor.ts';

describe('NoFilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = NoFilesInterceptor();
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    let parseSpy: ReturnType<
      typeof rs.spyOn<typeof multipartUtils, 'parseMultipartWithBusboy'>
    >;

    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
      parseSpy = rs
        .spyOn(multipartUtils, 'parseMultipartWithBusboy')
        .mockResolvedValue({ files: [], fields: [] });
    });

    afterEach(() => {
      parseSpy.mockRestore();
    });

    it('should call parseMultipartWithBusboy with files limit 0', async () => {
      const target = new (NoFilesInterceptor())();

      const req = {};
      setH3Event(req as any, {} as any);

      await target.intercept(new ExecutionContextHost([req]), handler);

      expect(parseSpy).toHaveBeenCalled();
      expect(parseSpy.mock.calls[0]?.[1]?.limits?.files).toBe(0);
    });

    it('should propagate parsing errors', async () => {
      const target = new (NoFilesInterceptor())();
      const err = new Error('parse failed');
      parseSpy.mockRejectedValue(err);

      const req = {};
      setH3Event(req as any, {} as any);

      await expect(
        target.intercept(new ExecutionContextHost([req]), handler),
      ).rejects.toThrow('parse failed');
    });
  });
});
