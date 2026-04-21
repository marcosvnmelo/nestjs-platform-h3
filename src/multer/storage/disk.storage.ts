/* eslint-disable no-async-promise-executor */
import { Readable } from 'node:stream';
import type { MakeDirectoryOptions, PathLike } from 'node:fs';

import type {
  H3FileStream,
  H3UploadedFile,
} from '../interfaces/multer-options.interface.ts';
import type {
  DiskStorageOptions,
  RemoveCallback,
  StorageCallback,
  StorageEngine,
} from './storage.interface.ts';
import { promisify } from './utils/promisify.utils.ts';

/**
 * Generates a random filename using crypto.
 */
async function generateRandomFilename(): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Default destination function that returns the OS temp directory.
 */
function defaultDestination(
  _req: any,
  _file: H3UploadedFile | H3FileStream,
  callback: (error: Error | null, destination: string) => void,
): void {
  import('os')
    .then((os) => {
      callback(null, os.tmpdir());
    })
    .catch((err) => {
      callback(err, '');
    });
}

/**
 * Default filename function that generates a random filename.
 */
function defaultFilename(
  _req: any,
  _file: H3UploadedFile | H3FileStream,
  callback: (error: Error | null, filename: string) => void,
): void {
  generateRandomFilename()
    .then((filename) => {
      callback(null, filename);
    })
    .catch((err) => {
      callback(err, '');
    });
}

/* Skipped code */

/**
 * Disk storage engine for storing uploaded files to the filesystem.
 *
 * @example
 * ```typescript
 * const storage = new DiskStorage({
 *   destination: './uploads',
 *   filename: (req, file, cb) => {
 *     cb(null, `${Date.now()}-${file.originalname}`);
 *   }
 * });
 * ```
 *
 * @publicApi
 */
export class DiskStorage implements StorageEngine {
  private getDestination: (
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: (error: Error | null, destination: string) => void,
  ) => void;

  private getFilename: (
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: (error: Error | null, filename: string) => void,
  ) => void;

  constructor(options: DiskStorageOptions = {}) {
    // Set up destination resolver
    if (typeof options.destination === 'string') {
      const dest = options.destination;
      this.getDestination = (_req, _file, cb) => cb(null, dest);
    } else {
      this.getDestination = options.destination || defaultDestination;
    }

    // Set up filename resolver
    this.getFilename = options.filename || defaultFilename;
  }

  /**
   * Handle file storage by writing to disk.
   */
  _handleFile(
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: StorageCallback,
  ): void {
    void new Promise<Partial<H3UploadedFile>>(async (resolve, reject) => {
      const [destError, destination] = await promisify(
        this.getDestination,
        req,
        file,
      );
      if (destError) {
        return reject(destError);
      }

      const [nameError, filename] = await promisify(
        this.getFilename,
        req,
        file,
      );
      if (nameError) {
        return reject(nameError);
      }

      const path = await import('node:path');

      const finalPath = path.join(destination, filename);

      const fs = await import('node:fs');

      // Ensure destination directory exists
      const [mkdirError] = await promisify(
        fs.mkdir as (
          path: PathLike,
          options: MakeDirectoryOptions,
          callback: (err: NodeJS.ErrnoException | null) => void,
        ) => void,
        destination,
        {
          recursive: true,
        },
      );

      if (mkdirError) {
        return reject(mkdirError);
      }

      // Check if file is stream-based or buffer-based
      if ('stream' in file && file.stream) {
        // Stream-based file
        const [err, value] = await promisify(
          this.writeFromStream,
          file,
          finalPath,
          {
            destination,
            filename,
          },
        );

        return err ? reject(err) : resolve(value);
      }

      if ('buffer' in file && file.buffer) {
        // Buffer-based file
        const [err, value] = await promisify(
          this.writeFromBuffer,
          file,
          finalPath,
          {
            destination,
            filename,
          },
        );
        return err ? reject(err) : resolve(value);
      }

      reject(new Error('File has neither buffer nor stream'));
    })
      .then((info) => callback(null, info))
      .catch((err) => callback(err));
  }

  /**
   * Write file from buffer.
   */
  private writeFromBuffer(
    file: H3UploadedFile,
    finalPath: string,
    info: { destination: string; filename: string },
    callback: StorageCallback,
  ): void {
    void import('node:fs')
      .then(async (fs) => {
        const buffer = file.buffer!;

        const [writeError] = await promisify(
          fs.writeFile as (
            path: PathLike,
            data: Buffer,
            callback: (err: NodeJS.ErrnoException | null) => void,
          ) => void,
          finalPath,
          buffer,
        );

        if (writeError) {
          throw writeError;
        }

        return {
          destination: info.destination,
          filename: info.filename,
          path: finalPath,
          size: buffer.length,
        };
      })
      .then((info) => callback(null, info))
      .catch((err) => callback(err));
  }

  /**
   * Write file from stream.
   */
  private writeFromStream(
    file: H3FileStream,
    finalPath: string,
    info: { destination: string; filename: string },
    callback: StorageCallback,
  ): void {
    void new Promise<Partial<H3UploadedFile>>(async (resolve, reject) => {
      const fs = await import('node:fs');

      const writeStream = fs.createWriteStream(finalPath);
      let size = 0;

      // Convert ReadableStream to Node.js stream if needed
      const nodeStream = this.toNodeStream(file.stream);

      nodeStream.on('data', (chunk: Buffer) => {
        size += chunk.length;
      });

      nodeStream.on('error', (err: Error) => {
        writeStream.destroy();
        fs.unlink(finalPath, () => {
          // Ignore unlink errors
        });
        reject(err);
      });

      writeStream.on('error', (err: Error) => {
        nodeStream.destroy();
        fs.unlink(finalPath, () => {
          // Ignore unlink errors
        });
        reject(err);
      });

      writeStream.on('finish', () => {
        resolve({
          destination: info.destination,
          filename: info.filename,
          path: finalPath,
          size,
        });
      });

      nodeStream.pipe(writeStream);
    })
      .then((info) => callback(null, info))
      .catch((err) => callback(err));
  }

  /**
   * Convert a ReadableStream (Web API) to Node.js Readable stream if needed.
   */
  private toNodeStream(
    stream: Readable | ReadableStream<Uint8Array>,
  ): Readable {
    if (stream instanceof Readable) {
      return stream;
    }

    // Web API ReadableStream - convert to Node.js stream
    const reader = stream.getReader();
    return new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        } catch (err) {
          this.destroy(err as Error);
        }
      },
    });
  }

  /**
   * Remove a stored file from disk.
   */
  _removeFile(_req: any, file: H3UploadedFile, callback: RemoveCallback): void {
    void import('node:fs')
      .then(async (fs) => {
        const filePath = file.path;
        if (!filePath) {
          return;
        }

        const [err] = await promisify(fs.unlink, filePath);

        // Ignore ENOENT errors (file doesn't exist)
        if (err && err.code !== 'ENOENT') {
          throw err;
        }

        return;
      })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }
}

/**
 * Factory function to create a DiskStorage instance.
 *
 * @param options - Disk storage configuration options
 * @returns A new DiskStorage instance
 *
 * @example
 * ```typescript
 * const storage = diskStorage({
 *   destination: './uploads',
 *   filename: (req, file, cb) => {
 *     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
 *     cb(null, file.fieldname + '-' + uniqueSuffix);
 *   }
 * });
 * ```
 *
 * @publicApi
 */
export function diskStorage(options?: DiskStorageOptions): DiskStorage {
  return new DiskStorage(options);
}
