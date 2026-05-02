import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { of } from 'rxjs';

import type { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import type { H3MulterOptions } from '../interfaces/multer-options.interface.ts';
import { setH3Event } from '../../adapters/utils/h3-event.utils.ts';
import * as multipartUtils from '../multer/multipart.utils.ts';
import { FilesInterceptor } from './files.interceptor.ts';

describe('FilesInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FilesInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    let parseSpy: ReturnType<typeof rs.spyOn>;

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

    it('should call parseMultipartWithBusboy with maxCount applied to limits', async () => {
      const fieldName = 'file';
      const maxCount = 10;
      const target = new (FilesInterceptor(fieldName, maxCount))();

      const req = {};
      setH3Event(req as any, {} as any);

      await target.intercept(new ExecutionContextHost([req]), handler);

      expect(parseSpy).toHaveBeenCalled();
      const opts = parseSpy.mock.calls[0]?.[1] as H3MulterOptions | undefined;
      expect(opts?.limits?.files).toBe(maxCount);
    });

    it('should propagate parsing errors', async () => {
      const fieldName = 'file';
      const target = new (FilesInterceptor(fieldName))();
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
