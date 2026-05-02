import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { of } from 'rxjs';

import type { CallHandler } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

import { setH3Event } from '../../adapters/utils/h3-event.utils.ts';
import * as multipartUtils from '../multer/multipart.utils.ts';
import { FileFieldsInterceptor } from './file-fields.interceptor.ts';

describe('FileFieldsInterceptor', () => {
  it('should return metatype with expected structure', async () => {
    const targetClass = FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'anotherFile', maxCount: 1 },
    ]);
    expect(targetClass.prototype.intercept).not.toBeUndefined();
  });
  describe('intercept', () => {
    let handler: CallHandler;
    let parseSpy: ReturnType<typeof rs.spyOn>;
    let groupSpy: ReturnType<typeof rs.spyOn>;

    beforeEach(() => {
      handler = {
        handle: () => of('test'),
      };
      parseSpy = rs
        .spyOn(multipartUtils, 'parseMultipartWithBusboy')
        .mockResolvedValue({ files: [], fields: [] });
      groupSpy = rs.spyOn(multipartUtils, 'groupFilesByFields');
    });

    afterEach(() => {
      parseSpy.mockRestore();
      groupSpy.mockRestore();
    });

    it('should call parse then groupFilesByFields with upload fields', async () => {
      const fieldName1 = 'file';
      const maxCount1 = 1;
      const fieldName2 = 'anotherFile';
      const maxCount2 = 2;
      const uploadFields = [
        { name: fieldName1, maxCount: maxCount1 },
        { name: fieldName2, maxCount: maxCount2 },
      ];
      const target = new (FileFieldsInterceptor(uploadFields))();

      const req = {};
      setH3Event(req as any, {} as any);

      await target.intercept(new ExecutionContextHost([req]), handler);

      expect(parseSpy).toHaveBeenCalled();
      expect(groupSpy).toHaveBeenCalledWith([], uploadFields);
    });

    it('should propagate parsing errors', async () => {
      const uploadFields = [
        { name: 'file', maxCount: 1 },
        { name: 'anotherFile', maxCount: 2 },
      ];
      const target = new (FileFieldsInterceptor(uploadFields))();
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
