import { PassThrough } from 'node:stream';
import type { H3Event } from 'h3';
import { Busboy } from '@fastify/busboy';

import type {
  H3FileStream,
  H3FormField,
  H3MulterOptions,
} from '../interfaces/multer-options.interface.ts';
import { h3MultipartExceptions, transformException } from './multer.utils.ts';
import { isMultipartRequest } from './multipart.utils.ts';

/**
 * Parses multipart form data as streams for large file handling.
 * Returns file streams instead of buffering files in memory.
 *
 * @param event The H3 event containing the request
 * @param onFile Callback for each file stream
 * @param onField Callback for each form field
 * @param options Optional configuration for limits
 * @returns Promise resolving when parsing is complete
 *
 * @publicApi
 */
export async function parseMultipartAsStreams(
  event: H3Event,
  onFile: (file: H3FileStream) => void | Promise<void>,
  onField?: (field: H3FormField) => void | Promise<void>,
  options?: H3MulterOptions,
): Promise<void> {
  const limits = options?.limits || {};

  const nodeReq = event.runtime?.node?.req;
  if (!nodeReq) {
    return;
  }

  if (isMultipartRequest(event)) {
    return;
  }

  return new Promise((resolve, reject) => {
    let fileCount = 0;
    let fieldCount = 0;
    let partCount = 0;
    const pendingCallbacks: Promise<void>[] = [];

    const busboy = Busboy({
      headers: nodeReq.headers as {
        'content-type': string;
        [key: string]: string | string[] | undefined;
      },
      limits: {
        fieldNameSize: limits.fieldNameSize ?? 100,
        fieldSize: limits.fieldSize ?? 1024 * 1024,
        fields: limits.fields,
        fileSize: limits.fileSize,
        files: limits.files,
        parts: limits.parts,
        headerPairs: limits.headerPairs ?? 2000,
      },
    });

    busboy.on(
      'file',
      (fieldname, fileStream, filename, transferEncoding, mimeType) => {
        fileCount++;
        partCount++;

        if (limits.files !== undefined && fileCount > limits.files) {
          fileStream.resume();
          const error = new Error(h3MultipartExceptions.LIMIT_FILE_COUNT);
          return reject(transformException(error));
        }

        if (!filename) {
          fileStream.resume();
          return;
        }

        // Create a PassThrough stream so we can pass it to the callback
        const passThrough = new PassThrough();
        fileStream.pipe(passThrough);

        const fileStreamObj: H3FileStream = {
          fieldname,
          originalname: filename,
          encoding: transferEncoding,
          mimetype: mimeType || 'application/octet-stream',
          stream: passThrough,
        };

        const callbackResult = onFile(fileStreamObj);
        if (callbackResult instanceof Promise) {
          pendingCallbacks.push(callbackResult);
        }
      },
    );

    busboy.on(
      'field',
      (
        fieldname: string,
        value: string,
        _fieldnameTruncated: boolean,
        _valueTruncated: boolean,
        _encoding: string,
        _mimeType: string,
      ) => {
        fieldCount++;
        partCount++;

        if (limits.fields !== undefined && fieldCount > limits.fields) {
          const error = new Error(h3MultipartExceptions.LIMIT_FIELD_COUNT);
          return reject(transformException(error));
        }

        if (onField) {
          const field: H3FormField = {
            fieldname,
            value,
          };

          const callbackResult = onField(field);
          if (callbackResult instanceof Promise) {
            pendingCallbacks.push(callbackResult);
          }
        }
      },
    );

    busboy.on('error', (err: Error) => {
      reject(transformException(err));
    });

    busboy.on('finish', async () => {
      try {
        await Promise.all(pendingCallbacks);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    nodeReq.pipe(busboy);
  });
}
