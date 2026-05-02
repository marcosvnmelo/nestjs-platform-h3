import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { of } from 'rxjs';

import type { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import { setH3Event } from '../../adapters/utils/h3-event.utils.ts';
import * as multipartUtils from '../multer/multipart.utils.ts';
import { FileInterceptor } from './file.interceptor.ts';

describe('FileInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileInterceptor('file');
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    let parseSpy: ReturnType<typeof rs.spyOn>;
    let filterSpy: ReturnType<typeof rs.spyOn>;

    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
      parseSpy = rs
        .spyOn(multipartUtils, 'parseMultipartWithBusboy')
        .mockResolvedValue({ files: [], fields: [] });
      filterSpy = rs.spyOn(multipartUtils, 'filterFilesByFieldName');
    });

    afterEach(() => {
      parseSpy.mockRestore();
      filterSpy.mockRestore();
    });

    it('should call parse then filterFilesByFieldName with field name', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName))();

      const req = {};
      setH3Event(req as any, {} as any);

      await target.intercept(new ExecutionContextHost([req]), handler);

      expect(parseSpy).toHaveBeenCalled();
      expect(filterSpy).toHaveBeenCalledWith([], fieldName);
    });

    it('should propagate parsing errors', async () => {
      const fieldName = 'file';
      const target = new (FileInterceptor(fieldName))();
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
