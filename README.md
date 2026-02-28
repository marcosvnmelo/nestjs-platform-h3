# @marcosvnmelo/nestjs-platform-h3

H3 platform adapter for NestJS.

This package lets you run regular NestJS apps on top of [h3](https://h3.unjs.io), including support for:

- Nest core HTTP features (routing, pipes, guards, interceptors, filters, middleware)
- CORS and static assets
- HTTP/1.1, HTTPS, HTTP/2 (h2), and HTTP/2 cleartext (h2c)
- Multipart uploads (multer-style interceptors + stream interceptors)
- H3-specific parameter decorators

## Requirements

- Node.js 20+
- NestJS 11 (`@nestjs/common` and `@nestjs/core`)

## Installation

```bash
pnpm add @marcosvnmelo/nestjs-platform-h3 h3
```

## Quick start

```ts
import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestH3Application>(
    AppModule,
    new H3Adapter(),
  );

  app.enableCors();
  app.useStaticAssets('public', { prefix: '/static' });

  await app.listen(3000);
}

void bootstrap();
```

## HTTP/2 support

### HTTP/2 over TLS (h2)

```ts
import { readFileSync } from 'node:fs';

import { NestFactory } from '@nestjs/core';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

const key = readFileSync('./certs/key.pem');
const cert = readFileSync('./certs/cert.pem');

const app = await NestFactory.create<NestH3Application>(
  AppModule,
  new H3Adapter(),
  {
    httpsOptions: { key, cert },
    http2Options: { http2: true, allowHTTP1: true },
  },
);
```

### HTTP/2 cleartext (h2c)

```ts
const app = await NestFactory.create<NestH3Application>(
  AppModule,
  new H3Adapter(),
  {
    http2Options: { http2: true },
  },
);
```

> h2c is useful for server-to-server traffic. Browsers do not support h2c.

## H3 decorators

Use H3-specific decorators when you want direct access to H3 request primitives:

- `@H3Event()`
- `@H3Request()`
- `@H3Response()`
- `@H3Query()`
- `@H3Params()`
- `@H3Body()`

Example:

```ts
import { Controller, Get } from '@nestjs/common';

import { H3Event, H3Query } from '@marcosvnmelo/nestjs-platform-h3';

@Controller('users')
export class UsersController {
  @Get()
  list(@H3Event() event: any, @H3Query('page') page?: string) {
    return {
      hasEvent: !!event,
      page,
    };
  }
}
```

## Multipart uploads

The library exposes multer-style interceptors and storage engines:

- Interceptors:
  - `FileInterceptor`
  - `FilesInterceptor`
  - `FileFieldsInterceptor`
  - `AnyFilesInterceptor`
  - `NoFilesInterceptor`
  - `FileStreamInterceptor`
  - `FilesStreamInterceptor`
  - `AnyFilesStreamInterceptor`
- Decorators:
  - `@UploadedFields()`
  - `@FormBody()`
  - `@FormField('name')`
- Storage:
  - `memoryStorage()`
  - `diskStorage()`

Single file example:

```ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import type { H3UploadedFile } from '@marcosvnmelo/nestjs-platform-h3';
import { FileInterceptor } from '@marcosvnmelo/nestjs-platform-h3';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadSingle(@UploadedFile() file: H3UploadedFile) {
    return {
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    };
  }
}
```

You can also configure upload defaults globally with `H3MulterModule.register(...)` or `H3MulterModule.registerAsync(...)`.

## Adapter hooks

`H3Adapter` includes lightweight lifecycle hooks:

- `setOnRequestHook((req, res, done) => ...)`
- `setOnResponseHook((req, res) => ...)`

These are useful for custom request/response instrumentation.

## Public exports

The package exports:

- `H3Adapter`
- `NestH3Application` interface
- H3 decorators
- Multipart module/interceptors/decorators/storage/utilities

## Development

Install dependencies:

```bash
pnpm install
```

Build:

```bash
pnpm run build
```

Watch mode:

```bash
pnpm run dev
```

Run tests:

```bash
pnpm run test
```

Lint:

```bash
pnpm run lint
```

Format:

```bash
pnpm run format
```

Benchmark (builds library + benchmark package):

```bash
pnpm run benchmark
```
