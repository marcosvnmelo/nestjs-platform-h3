import * as fs from 'node:fs';
import * as http from 'node:http';
import * as http2 from 'node:http2';
import * as https from 'node:https';
import * as path from 'node:path';
import { isPromise } from 'node:util/types';
import type { H3Config, H3Event, HTTPMethod } from 'h3';
import type { Writable } from 'node:stream';
import type { ServerRequest } from 'srvx';
import { fromNodeHandler, H3, handleCors, readBody, serveStatic } from 'h3';
import { toNodeHandler } from 'h3/node';

import type { NestApplicationOptions, VersioningOptions } from '@nestjs/common';
import type { VersionValue } from '@nestjs/common/interfaces/version-options.interface.js';
import {
  HttpStatus,
  InternalServerErrorException,
  Logger,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import {
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils.js';
import { AbstractHttpAdapter } from '@nestjs/core/adapters/http-adapter.js';
import { LegacyRouteConverter } from '@nestjs/core/router/legacy-route-converter.js';

import type {
  CorsConfig,
  CorsOptions,
  CorsOptionsCallback,
} from '../interfaces/cors-options.interface.ts';
import type {
  H3NodeHandler,
  H3Server,
  H3ServerRequest,
  H3ServerResponse,
  PolyfilledRequest,
  PolyfilledResponse,
} from '../interfaces/nest-h3-application.interface.ts';
import type { ServeStaticOptions } from '../interfaces/serve-static-options.interface.ts';
import { setH3ParsedBody } from './utils/body.utils.ts';
import { setH3Event } from './utils/h3-event.utils.ts';
import { copyHeadersFromEvent } from './utils/headers.utils.ts';
import {
  applyExpressPolyfills,
  applyParamsToRequest,
  extractNodeRequestFromEvent,
  extractNodeResponseFromEvent,
  extractNodeRuntimeFromEvent,
} from './utils/node-runtime.utils.ts';
import {
  $h3Handled,
  $h3NextHandler,
  $h3NotFound,
} from './utils/symbols.utils.ts';

/**
 * HTTP/2 options for the H3 adapter.
 *
 * @publicApi
 */
export interface H3Http2Options {
  /**
   * Enable HTTP/2 support.
   */
  http2: true;
  /**
   * TLS/SSL options for secure HTTP/2 connections (h2).
   * Required for HTTP/2 in browsers.
   */
  http2Options?: http2.SecureServerOptions;
  /**
   * Allow HTTP/1 connections as a fallback via ALPN negotiation.
   * Defaults to true.
   */
  allowHTTP1?: boolean;
}

/**
 * HTTP/2 cleartext options (h2c) - HTTP/2 without TLS.
 * Note: Browsers do not support h2c, only server-to-server communication.
 *
 * @publicApi
 */
export interface H3Http2CleartextOptions {
  /**
   * Enable HTTP/2 cleartext support (h2c).
   */
  http2: true;
  /**
   * HTTP/2 server options (without TLS).
   */
  http2Options?: http2.ServerOptions;
}

/**
 * Extended application options for H3 with HTTP/2 support.
 *
 * @publicApi
 */
export interface H3ApplicationOptions extends NestApplicationOptions {
  /**
   * HTTP/2 configuration options.
   */
  http2Options?: H3Http2Options | H3Http2CleartextOptions;
}

type VersionedRoute = <
  TRequest extends Record<string, any> = any,
  TResponse = any,
>(
  req: TRequest,
  res: TResponse,
  next: () => void,
) => any;

/**
 * Internal handler metadata for route chaining.
 */
interface HandlerInfo {
  handler: Function;
}

export class H3Adapter extends AbstractHttpAdapter<
  H3Server,
  http.IncomingMessage | http2.Http2ServerRequest,
  http.ServerResponse | http2.Http2ServerResponse
> {
  declare protected readonly instance: H3;
  private readonly logger = new Logger(H3Adapter.name);
  private isHttp2 = false;
  private corsConfig?: CorsConfig;
  private onRequestHook?: (
    req: PolyfilledRequest<H3ServerRequest>,
    res: PolyfilledResponse<H3ServerResponse>,
    done: () => void,
  ) => Promise<void> | void;
  private onResponseHook?: (
    req: PolyfilledRequest<H3ServerRequest>,
    res: PolyfilledResponse<H3ServerResponse>,
  ) => Promise<void> | void;
  private onNotFoundHook?: (
    req: H3ServerRequest,
    res: H3ServerResponse,
  ) => Promise<void>;
  private onErrorHook?: (
    error: Error,
    req: H3ServerRequest,
    res: H3ServerResponse,
    next: (err?: Error) => void,
  ) => Promise<void>;
  /**
   * Route registry mapping 'METHOD:path' to array of handlers.
   * Enables multiple versioned handlers for the same path.
   */
  private readonly routeMap = new Map<string, HandlerInfo[]>();
  /**
   * Tracks which method:path combinations have been registered with H3.
   * Prevents duplicate route registrations.
   */
  private readonly registeredPaths = new Set<string>();

  constructor(instanceOrOptions?: H3 | H3Config) {
    super(
      instanceOrOptions && 'config' in instanceOrOptions
        ? instanceOrOptions
        : new H3(instanceOrOptions),
    );

    this.instance.use(async (event, next) => {
      const [req, res] = extractNodeRuntimeFromEvent<
        PolyfilledRequest<H3ServerRequest>,
        PolyfilledResponse<H3ServerResponse>
      >(event);

      setH3Event(req, event);
      applyParamsToRequest(req, event);
      applyExpressPolyfills(res);

      if (this.onResponseHook) {
        res.on('finish', () => {
          void this.onResponseHook!.call(this, req, res);
        });
      }

      if (this.onRequestHook) {
        await new Promise<void>((resolve, reject) => {
          const done = (err?: Error) => {
            if (err) reject(err);
            else resolve();
          };

          const maybePromise = this.onRequestHook!.call(this, req, res, done);
          if (isPromise(maybePromise)) maybePromise.then().catch(reject);
          else resolve();
        });
      }

      if (this.corsConfig !== undefined) {
        const corsOptions = await new Promise<CorsOptions>(
          (resolve, reject) => {
            if (!isFunction(this.corsConfig)) {
              return resolve(this.corsConfig!);
            }

            const callback: CorsOptionsCallback = (error, options) => {
              if (error) {
                reject(error);
              } else {
                resolve(options);
              }
            };
            this.corsConfig(req, callback);
          },
        );

        const corsResult = handleCors(event, corsOptions);
        copyHeadersFromEvent(event, res);
        if (corsResult !== false) {
          return corsResult;
        }
      }

      if (this.onNotFoundHook) {
        return this.invokeNotFoundHandler(event, next);
      }
    });
  }

  public getInstance<T = H3>(): T {
    return this.instance as T;
  }

  /**
   * Sets a hook that is called before each request is processed.
   * The hook can perform async operations and must call `done()` when finished.
   *
   * @param onRequestHook - The hook function to call before each request
   */
  public setOnRequestHook(
    onRequestHook: (
      req: PolyfilledRequest<H3ServerRequest>,
      res: PolyfilledResponse<H3ServerResponse>,
      done: () => void,
    ) => Promise<void> | void,
  ) {
    this.onRequestHook = onRequestHook;
  }

  /**
   * Sets a hook that is called after each response is finished.
   *
   * @param onResponseHook - The hook function to call after each response
   */
  public setOnResponseHook(
    onResponseHook: (
      req: PolyfilledRequest<H3ServerRequest>,
      res: PolyfilledResponse<H3ServerResponse>,
    ) => Promise<void> | void,
  ) {
    this.onResponseHook = onResponseHook;
  }

  public reply(
    response: PolyfilledResponse<H3ServerResponse>,
    body: any,
    statusCode?: number,
  ) {
    if (statusCode) {
      response.status(statusCode);
    }
    if (isNil(body)) {
      return response.send();
    }
    if (body instanceof StreamableFile) {
      this.applyStreamHeaders(response, body);
      const stream = body.getStream();
      stream.once('error', (err) => {
        body.errorHandler(err, response);
      });
      return stream
        .pipe<Writable>(response)
        .on('error', (err: Error) => body.errorLogger(err));
    }
    // Only set Content-Type if headers haven't been sent yet
    if (!response.headersSent) {
      const responseContentType = response.getHeader('Content-Type');
      if (
        typeof responseContentType === 'string' &&
        !responseContentType.startsWith('application/json') &&
        body?.statusCode >= HttpStatus.BAD_REQUEST
      ) {
        this.logger.warn(
          "Content-Type doesn't match Reply body, you might need a custom ExceptionFilter for non-JSON responses",
        );
        response.setHeader('Content-Type', 'application/json');
      }
    }
    return isObject(body) ? response.json(body) : response.send(String(body));
  }

  public status(
    response: PolyfilledResponse<H3ServerResponse>,
    statusCode: number,
  ) {
    return response.status(statusCode);
  }

  public end(response: H3ServerResponse, message?: string) {
    return response.end(message as any);
  }

  /**
   * Render method is part of the AbstractHttpAdapter interface contract.
   * Template rendering is not yet supported in H3Adapter.
   */
  public render(response: H3ServerResponse, _view: string, _options: any) {
    this.logger.warn('render() is not supported in H3Adapter yet.');
    return response.end('Render not supported');
  }

  public redirect(response: H3ServerResponse, statusCode: number, url: string) {
    response.statusCode = statusCode;
    response.setHeader('Location', url);
    response.end();
  }

  private async invokeErrorHandler(error: Error, event: H3Event) {
    await this.onErrorHook!(
      error,
      extractNodeRequestFromEvent(event),
      extractNodeResponseFromEvent(event),
      (_err: any) => {
        // Next callback - error parameter required by signature but not used
      },
    );

    // Ensure error handler is treated as fully handled by H3.
    return $h3Handled;
  }

  /**
   * The prefix parameter is part of the AbstractHttpAdapter interface contract.
   * It represents the global prefix but is not used in H3's error handler implementation.
   */
  public setErrorHandler(handler: Function, _prefix?: string) {
    if (!this.onErrorHook)
      this.instance.config.onError = this.invokeErrorHandler.bind(this);

    this.onErrorHook = handler as typeof this.onErrorHook;

    return this;
  }

  private async invokeNotFoundHandler(
    event: H3Event,
    next: () => Promise<unknown> | unknown,
  ) {
    const nextResult = await next();

    if (nextResult !== $h3NotFound) return nextResult;

    const result = await this.onNotFoundHook!(
      ...extractNodeRuntimeFromEvent(event),
    );

    // Ensure not-found handler is treated as fully handled by H3.
    return result ?? $h3Handled;
  }

  /**
   * The prefix parameter is part of the AbstractHttpAdapter interface contract.
   * It represents the global prefix but is not used in H3's not-found handler implementation.
   */
  public setNotFoundHandler(handler: Function, _prefix?: string) {
    this.onNotFoundHook = handler as typeof this.onNotFoundHook;

    return this;
  }

  public isHeadersSent(response: H3ServerResponse): boolean {
    return response.headersSent;
  }

  public getHeader(
    response: PolyfilledResponse<H3ServerResponse>,
    name: string,
  ) {
    return response.get(name);
  }

  public setHeader(
    response: PolyfilledResponse<H3ServerResponse>,
    name: string,
    value: string,
  ) {
    return response.set(name, value);
  }

  public appendHeader(response: H3ServerResponse, name: string, value: string) {
    const prev = response.getHeader(name);
    if (!prev) {
      response.setHeader(name, value);
    } else {
      const newValue = Array.isArray(prev)
        ? [...prev, value]
        : [String(prev), value];
      response.setHeader(name, newValue);
    }
  }

  public listen(port: string | number, callback?: () => void): any;
  public listen(
    port: string | number,
    hostname: string,
    callback?: () => void,
  ): any;
  public listen(port: any, ...args: any[]): any {
    return this.httpServer.listen(port, ...args);
  }

  public close() {
    if (!this.httpServer) {
      return undefined;
    }
    return new Promise((resolve) => this.httpServer.close(resolve));
  }

  public enable(..._args: any[]): this {
    return this;
  }

  public disable(..._args: any[]): this {
    return this;
  }

  public engine(..._args: any[]): this {
    return this;
  }

  /**
   * Serves static files from the specified directory.
   *
   * @param staticPath - The path to the directory containing static files
   * @param options - Options for serving static files (prefix, maxAge, etc.)
   */
  public useStaticAssets(staticPath: string, options?: ServeStaticOptions) {
    const prefix = options?.prefix || '';
    const normalizedPrefix = prefix.endsWith('/')
      ? prefix.slice(0, -1)
      : prefix;

    // Register static file handler using H3's serveStatic
    this.instance.use(async (event) => {
      const url =
        extractNodeRequestFromEvent(event).url ??
        event.url.pathname + event.url.search;
      const urlPath = url.split('?')[0];

      // Check if URL matches prefix
      if (normalizedPrefix && !urlPath.startsWith(normalizedPrefix)) {
        return; // Continue to next handler
      }

      // Remove prefix from path to get the file path
      const filePath = normalizedPrefix
        ? urlPath.slice(normalizedPrefix.length)
        : urlPath;

      // Construct the full file path
      const resolvedPath = path.join(staticPath, filePath);

      // Security: Ensure the resolved path is within the static directory
      const absoluteStaticPath = path.resolve(staticPath);
      const absoluteResolvedPath = path.resolve(resolvedPath);
      if (!absoluteResolvedPath.startsWith(absoluteStaticPath)) {
        return; // Prevent directory traversal attacks
      }

      // Handle dotfiles
      const basename = path.basename(filePath);
      if (basename.startsWith('.')) {
        const dotfileHandling = options?.dotfiles || 'ignore';
        if (dotfileHandling === 'deny') {
          const res = event.runtime?.node?.res;
          if (res) {
            res.statusCode = 403;
            res.end('Forbidden');
          }
          return;
        }
        if (dotfileHandling === 'ignore') {
          return; // Continue to next handler
        }
        // 'allow' falls through to serve the file
      }

      // Use H3's serveStatic helper
      const result = await serveStatic(event, {
        getContents: async (id) => {
          // Strip prefix from id since serveStatic passes the full path
          const idWithoutPrefix = normalizedPrefix
            ? id.replace(normalizedPrefix, '')
            : id;
          const fullPath = path.join(absoluteStaticPath, idWithoutPrefix);
          // Security check again
          const absFullPath = path.resolve(fullPath);
          if (!absFullPath.startsWith(absoluteStaticPath)) {
            return undefined;
          }
          try {
            return fs.promises.readFile(absFullPath);
          } catch {
            return undefined;
          }
        },
        getMeta: async (id) => {
          // Strip prefix from id since serveStatic passes the full path
          const idWithoutPrefix = normalizedPrefix
            ? id.replace(normalizedPrefix, '')
            : id;
          const fullPath = path.join(absoluteStaticPath, idWithoutPrefix);
          const absFullPath = path.resolve(fullPath);
          if (!absFullPath.startsWith(absoluteStaticPath)) {
            return undefined;
          }
          try {
            const stats = await fs.promises.stat(absFullPath);

            // H3's serveStatic handles index file lookup via indexNames option
            // So we only return metadata for actual files
            if (!stats.isFile()) {
              return undefined;
            }

            return {
              size: stats.size,
              mtime: stats.mtime,
            };
          } catch {
            return undefined;
          }
        },
        indexNames:
          options?.index === false
            ? []
            : options?.index === true || options?.index === undefined
              ? ['/index.html']
              : Array.isArray(options?.index)
                ? options.index.map((f: string) =>
                    f.startsWith('/') ? f : `/${f}`,
                  )
                : [
                    options.index.startsWith('/')
                      ? options.index
                      : `/${options.index}`,
                  ],
        // Allow fallthrough to next handler if file not found
        fallthrough: true,
      });

      // Apply custom headers if file was served
      if (result !== undefined) {
        const res = event.runtime?.node?.res;
        if (res) {
          // Apply ETag if enabled (default: true)
          if (options?.etag !== false) {
            // ETag is typically handled by serveStatic, but we could enhance it here
          }

          // Apply Last-Modified if enabled (default: true)
          if (options?.lastModified !== false) {
            // Last-Modified is typically handled by serveStatic
          }

          // Apply max-age cache control
          if (options?.maxAge !== undefined) {
            const maxAge =
              typeof options.maxAge === 'string'
                ? this.parseMaxAge(options.maxAge)
                : options.maxAge;
            let cacheControl = `max-age=${Math.floor(maxAge / 1000)}`;
            if (options?.immutable) {
              cacheControl += ', immutable';
            }
            res.setHeader('Cache-Control', cacheControl);
          }

          // Apply custom headers
          if (options?.setHeaders) {
            try {
              const stats = await fs.promises.stat(absoluteResolvedPath);
              options.setHeaders(res, absoluteResolvedPath, stats);
            } catch {
              // File stats not available
            }
          }
        }
      }

      return result;
    });

    return this;
  }

  /**
   * Parse a max-age string like '1d', '2h', '30m' to milliseconds
   */
  private parseMaxAge(maxAge: string): number {
    const match = maxAge.match(/^(\d+)(ms|s|m|h|d)?$/);
    if (!match) {
      return 0;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2] || 'ms';
    switch (unit) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  }

  public setBaseViewsDir(..._args: any[]) {
    return this;
  }

  public setViewEngine(..._args: any[]) {
    return this;
  }

  public getRequestHostname(request: H3ServerRequest): string {
    return request.headers?.host ?? '';
  }

  public getRequestMethod(request: H3ServerRequest): string {
    return request.method ?? 'GET';
  }

  public getRequestUrl(request: H3ServerRequest): string {
    return request.url ?? '';
  }

  public enableCors(options?: CorsConfig) {
    this.corsConfig = options ?? { origin: '*' };
  }

  public fetch(request: Request | ServerRequest): Promise<Response> {
    const maybePromise = this.instance.fetch(request);

    if (isPromise(maybePromise)) return maybePromise;
    return Promise.resolve(maybePromise);
  }

  /**
   * The requestMethod parameter is part of the AbstractHttpAdapter interface contract.
   * H3 middleware uses instance.use() which doesn't filter by HTTP method (similar to Fastify).
   */
  public createMiddlewareFactory(
    _requestMethod: RequestMethod,
  ): (path: string, callback: Function) => any {
    return (path: string, callback: Function) => {
      const h3Path = this.convertPathPattern(path);
      const handler = fromNodeHandler(callback as H3NodeHandler);

      // For root wildcard patterns that should match all paths,
      // register middleware for both root and wildcard patterns in H3
      // {*path} converted to / - register for root + all subpaths
      this.instance.use(h3Path === '/' ? '**' : h3Path, handler);
    };
  }

  /**
   * Convert NestJS route patterns to rou3-compatible patterns.
   *
   * NestJS wildcard semantics vs rou3:
   * - NestJS `*` or `*path` = greedy match across / (multi-segment)
   * - rou3 `**` = match zero or more segments
   * - rou3 `**:name` = match zero or more segments with capture
   * - rou3 `*` = match single segment wildcard
   *
   * Conversion rules:
   * - `*` or `*path` → `/**` or `/**:path`
   * - `path/*` or `path/*path` → `/path/**` or `/path/**:path`
   * - `{*path}` → `/**:path` (catch-all with capture)
   * - `path/(.*)` → `/path/**` (regex catch-all)
   * - `:param` patterns stay as-is (already rou3 compatible)
   */
  private convertPathPattern(pattern: string): string {
    // Ensure pattern starts with /
    if (!pattern.startsWith('/')) {
      pattern = '/' + pattern;
    }

    // Handle root wildcard: * or *path → /** or /**:path
    if (pattern === '/*' || pattern === '/*path') {
      return pattern === '/*' ? '/**' : '/**:path';
    }

    // Handle wildcard at end: path/* or path/*path → /path/** or /path/**:path
    if (pattern.endsWith('/*') || pattern.endsWith('/*path')) {
      const basePath = pattern.replace(/\/\*.*$/, '');
      const hasCapture = pattern.endsWith('/*path');
      return hasCapture ? `${basePath}/**:path` : `${basePath}/**`;
    }

    // Handle curly brace wildcard: {*path} → /** (match all paths)
    if (pattern === '/{*path}' || pattern.endsWith('/{*path}')) {
      if (pattern === '/{*path}') {
        // {*path} matches all paths - use wildcard that H3/rou3 understands
        // Register for root to catch / specifically, and middleware will handle prefixed paths
        return '/';
      }
      // path/{*path} → /path/** (match everything under path)
      const basePath = pattern.replace(/\/\{.*\}$/, '');
      return `${basePath}/**`;
    }

    // Handle regex patterns: path/(.*) or path/(.*) → /path/**
    if (pattern.includes('(') && pattern.includes(')')) {
      // Simple conversion: remove regex capture groups and convert to rou3 wildcard
      // path/(.*) or path/(.*)/something → /path/** or /path/**/something
      const converted = pattern.replace(/\/\(\.\*\)/g, '/**');
      return converted;
    }

    // Try LegacyRouteConverter for other patterns
    try {
      const converted = LegacyRouteConverter.tryConvert(pattern);
      return converted;
    } catch {
      // If conversion fails, return pattern as-is
      return pattern;
    }
  }

  /**
   * Initialize the HTTP server with support for HTTP/1.1, HTTPS, and HTTP/2.
   *
   * HTTP/2 can be enabled by passing `http2Options` in the application options:
   *
   * @example
   * ```typescript
   * // HTTP/2 with TLS (h2)
   * const app = await NestFactory.create(AppModule, new H3Adapter(), {
   *   httpsOptions: { key, cert },
   *   http2Options: { http2: true, allowHTTP1: true }
   * });
   *
   * // HTTP/2 cleartext (h2c) - for server-to-server only
   * const app = await NestFactory.create(AppModule, new H3Adapter(), {
   *   http2Options: { http2: true }
   * });
   * ```
   *
   * @param options - Application options including HTTP/2 configuration
   */
  public initHttpServer(
    options: NestApplicationOptions & {
      http2Options?: H3Http2Options | H3Http2CleartextOptions;
    },
  ) {
    const requestListener = toNodeHandler(this.instance);

    // Check for HTTP/2 options
    if (options?.http2Options?.http2) {
      this.isHttp2 = true;

      // HTTP/2 with TLS (h2) - required for browser support
      if (options.httpsOptions) {
        const secureOptions: http2.SecureServerOptions = {
          ...options.httpsOptions,
          ...options.http2Options.http2Options,
          allowHTTP1:
            (options.http2Options as H3Http2Options).allowHTTP1 ?? true,
        };

        this.httpServer = http2.createSecureServer(
          secureOptions,
          requestListener as any,
        );

        this.logger.log('HTTP/2 secure server (h2) initialized');
      } else {
        // HTTP/2 cleartext (h2c) - only for server-to-server communication
        const h2cOptions: http2.ServerOptions = {
          ...options.http2Options.http2Options,
        };

        this.httpServer = http2.createServer(
          h2cOptions,
          requestListener as any,
        );

        this.logger.warn(
          'HTTP/2 cleartext server (h2c) initialized. Note: Browsers do not support h2c.',
        );
      }
    } else if (options?.httpsOptions) {
      // HTTPS (HTTP/1.1 over TLS)
      this.httpServer = https.createServer(
        options.httpsOptions,
        requestListener,
      );
    } else {
      // HTTP/1.1
      this.httpServer = http.createServer(requestListener);
    }
  }

  /**
   * Returns whether the server is running in HTTP/2 mode.
   *
   * @returns {boolean} True if HTTP/2 is enabled
   */
  public isHttp2Enabled(): boolean {
    return this.isHttp2;
  }

  /**
   * Parameters are part of the AbstractHttpAdapter interface contract.
   * The prefix parameter could be used to conditionally apply parsing based on path prefix.
   * The rawBody parameter could be used to configure raw body parsing.
   * Currently, H3 adapter applies body parsing globally for POST, PUT, and PATCH requests.
   * Multipart form data is skipped to allow interceptors to handle file uploads.
   */
  public registerParserMiddleware(_prefix?: string, rawBody?: boolean) {
    this.instance.use(async (event) => {
      const contentType = event.req.headers.get('Content-Type');
      // Skip multipart/form-data to allow interceptors to handle file uploads
      if (contentType && !contentType.includes('multipart/form-data')) {
        setH3ParsedBody(await readBody(event), event, rawBody);
      }
    });
  }

  public getType(): string {
    return 'h3';
  }

  public use(handler: Function): void;
  public use(path: string, handler: Function): void;
  public use(...args: [Function] | [string, Function]) {
    const path = (args.length > 1 ? args[0] : '**') as string;
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.createMiddlewareFactory(RequestMethod.ALL)(path, handler);
  }

  public get(handler: Function): void;
  public get(path: string, handler: Function): void;
  public get(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('GET', path, handler);
  }

  public post(handler: Function): void;
  public post(path: string, handler: Function): void;
  public post(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('POST', path, handler);
  }

  public put(handler: Function): void;
  public put(path: string, handler: Function): void;
  public put(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('PUT', path, handler);
  }

  public delete(handler: Function): void;
  public delete(path: string, handler: Function): void;
  public delete(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('DELETE', path, handler);
  }

  public patch(handler: Function): void;
  public patch(path: string, handler: Function): void;
  public patch(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('PATCH', path, handler);
  }

  public options(handler: Function): void;
  public options(path: string, handler: Function): void;
  public options(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('OPTIONS', path, handler);
  }

  public head(handler: Function): void;
  public head(path: string, handler: Function): void;
  public head(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('HEAD', path, handler);
  }

  public all(handler: Function): void;
  public all(path: string, handler: Function): void;
  public all(...args: [Function] | [string, Function]) {
    const path = args.length > 1 ? (args[0] as string) : '/';
    const handler =
      args.length > 1 ? (args[1] as Function) : (args[0] as Function);
    this.registerRoute('ALL', path, handler);
  }

  private getHandlersFactory(
    path: string,
  ): (method: HTTPMethod) => HandlerInfo[] {
    return (method) => {
      if (method !== 'HEAD') {
        return this.routeMap.get(`${method}:${path}`) ?? [];
      }

      // HEAD requests can be handled separately or by GET
      return [
        ...(this.routeMap.get(`${method}:${path}`) ?? []),
        ...(this.routeMap.get('GET:' + path) ?? []),
      ].flat();
    };
  }

  private getHandlersFromEvent(event: H3Event): HandlerInfo[] {
    const method = event.req.method as HTTPMethod;
    const getRoutes = event.context.matchedRoute?.meta?.getRoutes as ReturnType<
      typeof this.getHandlersFactory
    >;

    if (!getRoutes) {
      this.logger.warn('getRoutes() not found in matchedRoute.meta');
      return [];
    }

    return getRoutes(method);
  }

  /**
   * Registers a route handler using H3's native routing with handler chaining.
   * Uses H3's radix tree router for fast O(1) path matching.
   *
   * Implementation notes:
   * - Uses H3's native routing (instance.on()) for optimal performance
   * - Maintains route map to support multiple versioned handlers per path
   * - On first registration: creates chain handler and registers with H3
   * - On subsequent registrations: adds to route map, existing chain handler finds it
   * - Lazy lookup pattern: chain handler queries route map at request time
   * - Supports version filtering via next() callback mechanism
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param routePath - The route path pattern
   * @param handler - The route handler (possibly wrapped with version filter)
   */
  private registerRoute(
    method: HTTPMethod | 'ALL',
    routePath: string,
    handler: Function,
  ) {
    // Normalize path - remove trailing slash except for root
    const normalizedPath = this.convertPathPattern(routePath);

    const routeKey = `${method}:${normalizedPath}`;

    // Add handler to route map
    if (!this.routeMap.has(routeKey)) {
      this.routeMap.set(routeKey, []);
    }
    if (method === 'HEAD') this.routeMap.get(routeKey)!.unshift({ handler });
    else this.routeMap.get(routeKey)!.push({ handler });

    // Register with H3 only once per method:path combination
    if (!this.registeredPaths.has(routeKey)) {
      this.registerPath(method, normalizedPath);
    }

    // Express semantics: HEAD should be implicitly handled by GET route.
    // Register a HEAD matcher once so GET-only routes can respond to HEAD.
    if (method === 'GET') {
      const implicitHeadRouteKey = `HEAD:${normalizedPath}`;
      if (!this.registeredPaths.has(implicitHeadRouteKey)) {
        this.registerPath('HEAD', normalizedPath);
      }
    }
  }

  private registerPath(method: HTTPMethod | 'ALL', normalizedPath: string) {
    const routeKey = `${method}:${normalizedPath}`;
    this.registeredPaths.add(routeKey);

    // Create chain handler that performs lazy lookup from route map
    // H3 expects lowercase HTTP methods
    this.instance.on(
      method === 'ALL' ? '' : method,
      normalizedPath,
      async (event) => {
        // NOTE: Lazy lookup: get current handlers from map at request time
        // This allows handlers registered after this point to be found
        const handlers = this.getHandlersFromEvent(event);
        if (handlers.length === 0) {
          // No handlers for this route at this time - return 404
          return $h3NotFound;
        }

        const [req, res] = extractNodeRuntimeFromEvent(event);

        // Chain through handlers (supports versioning via next() callback)
        for (const handlerInfo of handlers) {
          // Stop if response is already sent (headers written)
          if (res.headersSent || res.writableEnded) {
            break;
          }

          const result = await this.invokeHandler(
            handlerInfo.handler,
            req,
            res,
          );

          // Handler completed successfully - return result to H3
          if (result !== $h3NextHandler) {
            return result;
          }

          // Handler called next() or returned undefined - try next handler
          // (version didn't match, or handler passed through)
        }

        // No handler matched (all called next()) - response should be sent
        // If response not already sent, return 404 via H3
        if (!res.headersSent && !res.writableEnded) {
          return $h3NotFound;
        }
        // Response was already sent by one of the handlers
        return $h3Handled;
      },
      {
        meta: {
          getRoutes: this.getHandlersFactory(normalizedPath),
        },
      },
    );
  }

  /**
   * Invokes the actual NestJS handler and manages response lifecycle.
   *
   * Instead of calling res.end() directly, reply/end/redirect capture the
   * response body. After the handler completes, the captured body is returned
   * as an Response so H3/srvx can send it through its native pipeline
   * (a single writeHead + write + end pass), eliminating the double-end
   * overhead of the previous approach.
   *
   * @param handler - The NestJS route handler function
   * @param req - Node.js request (HTTP/1 or HTTP/2)
   * @param res - Node.js response (HTTP/1 or HTTP/2)
   * @returns Promise resolving to Response, kHandled, or undefined
   */
  private invokeHandler(
    handler: Function,
    req: http.IncomingMessage | http2.Http2ServerRequest,
    res: http.ServerResponse | http2.Http2ServerResponse,
  ) {
    return new Promise<typeof $h3Handled | typeof $h3NextHandler>(
      (resolve, reject) => {
        let resolved = false;

        const resolveWith = (value: any) => {
          if (!resolved) {
            resolved = true;
            resolve(value);
          }
        };

        // Fallback: wait for finish (stream cases where pipe calls res.end)
        res.once('finish', () => resolveWith($h3Handled));

        // next() callback for version filtering
        const next = (err?: Error) => {
          if (resolved) return;
          resolved = true;
          if (err) {
            reject(err);
          } else {
            resolve($h3NextHandler); // Continue to next handler (version didn't match)
          }
        };

        const checkCapture = () => {
          if (resolved) return;
          if (res.writableEnded || res.headersSent) {
            // Response was sent directly (stream, @Res() decorator, etc.)
            resolveWith($h3Handled);
          }
          // else: wait for 'finish' event (rare edge case)
        };

        try {
          const result = handler(req, res, next);

          if (isPromise(result)) {
            result.then(checkCapture).catch((err: Error) => {
              if (!resolved) {
                resolved = true;
                reject(err);
              }
            });
          } else {
            checkCapture();
          }
        } catch (err) {
          if (!resolved) {
            resolved = true;
            reject(err as Error);
          }
        }
      },
    );
  }

  /**
   * Applies version filtering to a route handler.
   * Supports URI, Header, Media Type, and Custom versioning strategies.
   *
   * @param handler - The route handler function
   * @param version - The version(s) this handler supports
   * @param versioningOptions - The versioning configuration options
   * @returns A wrapped handler that filters by version
   */
  public applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions,
  ): VersionedRoute {
    const callNextHandler: VersionedRoute = (_req, _res, next) => {
      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
      return next();
    };

    // VERSION_NEUTRAL or URI versioning pass through directly
    // URI Versioning is done via the path, so the filter continues forward
    if (
      version === VERSION_NEUTRAL ||
      versioningOptions.type === VersioningType.URI
    ) {
      const handlerForNoVersioning: VersionedRoute = (req, res, next) =>
        handler(req, res, next);
      return handlerForNoVersioning;
    }

    // Custom Extractor Versioning Handler
    if (versioningOptions.type === VersioningType.CUSTOM) {
      const handlerForCustomVersioning: VersionedRoute = (req, res, next) => {
        const extractedVersion = versioningOptions.extractor(req);

        if (Array.isArray(version)) {
          if (
            Array.isArray(extractedVersion) &&
            version.filter((v) => extractedVersion.includes(v as string)).length
          ) {
            return handler(req, res, next);
          }

          if (
            isString(extractedVersion) &&
            version.includes(extractedVersion)
          ) {
            return handler(req, res, next);
          }
        } else if (isString(version)) {
          // Known limitation: if there are multiple versions supported across separate
          // handlers/controllers, we can't select the highest matching handler.
          // Since this code is evaluated per-handler, we can't see if the highest
          // specified version exists in a different handler.
          if (
            Array.isArray(extractedVersion) &&
            extractedVersion.includes(version)
          ) {
            return handler(req, res, next);
          }

          if (isString(extractedVersion) && version === extractedVersion) {
            return handler(req, res, next);
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForCustomVersioning;
    }

    // Media Type (Accept Header) Versioning Handler
    if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
      const handlerForMediaTypeVersioning: VersionedRoute = (
        req,
        res,
        next,
      ) => {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : undefined;

        // No version was supplied
        if (isUndefined(acceptHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key,
          )[1];

          if (Array.isArray(version)) {
            if (version.includes(headerVersion)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === headerVersion) {
              return handler(req, res, next);
            }
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForMediaTypeVersioning;
    }

    // Header Versioning Handler
    if (versioningOptions.type === VersioningType.HEADER) {
      const handlerForHeaderVersioning: VersionedRoute = (req, res, next) => {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        // No version was supplied
        if (isUndefined(customHeaderVersionParameter)) {
          if (Array.isArray(version)) {
            if (version.includes(VERSION_NEUTRAL)) {
              return handler(req, res, next);
            }
          }
        } else {
          if (Array.isArray(version)) {
            if (version.includes(customHeaderVersionParameter)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === customHeaderVersionParameter) {
              return handler(req, res, next);
            }
          }
        }

        return callNextHandler(req, res, next);
      };

      return handlerForHeaderVersioning;
    }

    throw new Error('Unsupported versioning options');
  }

  private setHeaderIfNotExists(
    response: H3ServerResponse,
    name: string,
    value?: string | string[] | number,
  ) {
    if (value !== undefined && response.getHeader(name) === undefined) {
      const headerValue = Array.isArray(value) ? value.join(',') : value;
      response.setHeader(name, headerValue);
    }
  }

  private applyStreamHeaders(
    response: H3ServerResponse,
    streamable: StreamableFile,
  ) {
    const headers = streamable.getHeaders();

    this.setHeaderIfNotExists(response, 'Content-Type', headers.type);
    this.setHeaderIfNotExists(
      response,
      'Content-Disposition',
      headers.disposition,
    );
    this.setHeaderIfNotExists(response, 'Content-Length', headers.length);
  }
}
