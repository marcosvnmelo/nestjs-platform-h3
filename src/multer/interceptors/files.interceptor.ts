import type { Observable } from 'rxjs';

import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { Inject, mixin, Optional } from '@nestjs/common';

import type { H3MulterModuleOptions } from '../interfaces';
import type { H3MulterOptions } from '../interfaces/multer-options.interface';
import { MULTER_MODULE_OPTIONS } from '../files.constants';
import {
  filterFilesByFieldName,
  parseMultipartFormDataWithFields,
} from '../multer/multipart.utils';

/**
 * Interceptor for handling multiple file uploads on the H3 platform
 * from a single field.
 * Uses H3's native multipart form data parsing.
 * Also captures form fields and attaches them to the request.
 *
 * @param fieldName The name of the field containing the files
 * @param maxCount Maximum number of files to accept (optional)
 * @param localOptions Optional configuration options (storage, limits, fileFilter)
 *
 * @publicApi
 */
export function FilesInterceptor(
  fieldName: string,
  maxCount?: number,
  localOptions?: H3MulterOptions,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    constructor(
      @Optional()
      @Inject(MULTER_MODULE_OPTIONS)
      protected options: H3MulterModuleOptions = {},
    ) {}

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const request = ctx.getRequest();

      // Get H3 event from request
      const h3Event = request.h3Event;
      if (!h3Event) {
        // If no h3Event, continue without file processing
        return next.handle();
      }

      const mergedOptions: H3MulterOptions = {
        ...this.options,
        ...localOptions,
      };

      // Apply maxCount to the files limit if specified
      if (maxCount !== undefined) {
        mergedOptions.limits = {
          ...mergedOptions.limits,
          files: maxCount,
        };
      }

      // Parse multipart form data using H3's native approach
      const { files, fields } = await parseMultipartFormDataWithFields(
        h3Event,
        mergedOptions,
      );

      // Filter to get only files from the specified field
      const fieldFiles = filterFilesByFieldName(files, fieldName);

      // Enforce maxCount if specified (in case there are multiple fields)
      if (maxCount !== undefined && fieldFiles.length > maxCount) {
        // Truncate to maxCount
        request.files = fieldFiles.slice(0, maxCount);
      } else {
        request.files = fieldFiles;
      }

      // Also attach form fields to request
      request.formFields = fields;

      return next.handle();
    }
  }

  const Interceptor = mixin(MixinInterceptor);
  return Interceptor;
}
