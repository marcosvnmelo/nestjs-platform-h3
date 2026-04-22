import type { H3, H3Event, NodeHandler, NodeMiddleware } from 'h3';
import type * as http from 'http';
import type * as http2 from 'http2';
import type * as https from 'https';
import type {
  NodeServerRequest,
  NodeServerResponse,
  ServerRequest,
} from 'srvx';

import type { INestApplication } from '@nestjs/common';

import type { H3Adapter } from '../adapters/h3-adapter.ts';
import type { $h3Event } from '../adapters/utils/symbols.utils.ts';
import type { H3FormField, H3UploadedFile } from '../multer/index.ts';
import type { CorsConfig } from './cors-options.interface.ts';
import type { ServeStaticOptions } from './serve-static-options.interface.ts';

/**
 * HTTP/2 compatible server type for H3.
 */
export type H3Server =
  | http.Server
  | https.Server
  | http2.Http2Server
  | http2.Http2SecureServer;

export type H3EventRequest = H3Event['req'];

export type H3ServerRequest = NodeServerRequest;

export type H3ServerResponse = NodeServerResponse;

export type H3NodeHandler = NodeHandler;

export type H3NodeMiddleware = NodeMiddleware;

export type PolyfilledRequest<R extends H3ServerRequest> = R & {
  [$h3Event]: H3Event;
  // NOTE: Fields used by NestJS
  query: Record<string, string>;
  params: Record<string, string>;
  body: unknown;
  file?: H3UploadedFile;
  files: H3UploadedFile[] | Record<string, H3UploadedFile[]>;
  formFields: H3FormField[];
};

export type PolyfilledResponse<R extends H3ServerResponse> = R & {
  contentType: (type: string) => PolyfilledResponse<R>;
  type: (type: string) => PolyfilledResponse<R>;
  get: H3ServerResponse['getHeader'];
  header: (
    ...args: [string, string] | [Record<string, string>]
  ) => PolyfilledResponse<R>;
  set: (
    ...args: [string, string] | [Record<string, string>]
  ) => PolyfilledResponse<R>;
  json: (body: string | number | boolean | object) => void;
  send: (body?: string | number | boolean | object | Buffer) => void;
  status: (statusCode: number) => PolyfilledResponse<R>;
};

/**
 * Interface describing methods on NestH3Application.
 *
 * @see [Platform](https://docs.nestjs.com/first-steps#platform)
 *
 * @publicApi
 */
export interface NestH3Application<
  TServer extends H3Server = http.Server,
> extends INestApplication<TServer> {
  /**
   * Returns the underlying HTTP adapter bounded to the H3 app.
   *
   * @returns {H3Adapter}
   */
  getHttpAdapter(): H3Adapter;

  /**
   * Starts the application.
   *
   * @param {number|string} port
   * @param {Function} [callback] Optional callback
   * @returns {Promise} A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(port: number | string, callback?: () => void): Promise<TServer>;
  /**
   * Starts the application.
   *
   * @param {number|string} port
   * @param {string} [hostname]
   * @param {Function} [callback] Optional callback
   * @returns {Promise} A Promise that, when resolved, is a reference to the underlying HttpServer.
   */
  listen(
    port: number | string,
    hostname: string,
    callback?: () => void,
  ): Promise<TServer>;

  /**
   * Sets a base directory for public assets.
   *
   * @example
   * app.useStaticAssets('public')
   * app.useStaticAssets('public', { prefix: '/static' })
   *
   * @param path - The path to the directory containing static files
   * @param options - Options for serving static files
   * @returns {this}
   */
  useStaticAssets(path: string, options?: ServeStaticOptions): this;

  /**
   * Enables CORS (Cross-Origin Resource Sharing).
   *
   * @example
   * app.enableCors()
   * app.enableCors({ origin: 'https://example.com' })
   *
   * @param config - CORS config
   */
  enableCors(config?: CorsConfig): void;

  /**
   * A wrapper function around native `h3.fetch()` method.
   * @param {Request | ServerRequest} request - The request object
   * @returns {Promise<Response>}
   */
  fetch(request: Request | ServerRequest): Promise<Response>;

  /**
   * A wrapper function for H3 settings.
   * This is a no-op stub for Express compatibility.
   *
   * @returns {this}
   */
  set(...args: any[]): this;

  /**
   * A wrapper function for Express compatibility.
   * This is a no-op stub in H3.
   *
   * @returns {this}
   */
  enable(...args: any[]): this;

  /**
   * A wrapper function for Express compatibility.
   * This is a no-op stub in H3.
   *
   * @returns {this}
   */
  disable(...args: any[]): this;

  /**
   * Template engine registration.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @returns {this}
   */
  engine(...args: any[]): this;

  /**
   * Sets the base directory for views/templates.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @param path - The path to the views directory
   * @returns {this}
   */
  setBaseViewsDir(path: string | string[]): this;

  /**
   * Sets the view engine for templates.
   * Note: Template rendering is not supported in H3.
   * This method exists for API compatibility but will log a warning.
   *
   * @param engine - The view engine name
   * @returns {this}
   */
  setViewEngine(engine: string): this;

  /**
   * Returns the underlying H3 instance.
   * Use this to access H3-specific features.
   *
   * @example
   * const h3 = app.getHttpAdapter().getInstance();
   *
   * @returns {H3}
   */
  getInstance(): H3;

  /**
   * Returns the HTTP adapter type identifier.
   *
   * @returns {string} Always returns 'h3'
   */
  getType(): string;

  /**
   * Sets a hook that is called before each request is processed.
   * The hook can perform async operations and must call `done()` when finished.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * adapter.setOnRequestHook((req, res, done) => {
   *   console.log('Request received:', req.url);
   *   done();
   * });
   *
   * @param onRequestHook - The hook function to call before each request
   */
  setOnRequestHook(
    onRequestHook: (
      req: H3ServerRequest,
      res: H3ServerResponse,
      done: () => void,
    ) => Promise<void> | void,
  ): void;

  /**
   * Sets a hook that is called after each response is finished.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * adapter.setOnResponseHook((req, res) => {
   *   console.log('Response sent for:', req.url);
   * });
   *
   * @param onResponseHook - The hook function to call after each response
   */
  setOnResponseHook(
    onResponseHook: (
      req: H3ServerRequest,
      res: H3ServerResponse,
    ) => Promise<void> | void,
  ): void;

  /**
   * Returns whether the server is running in HTTP/2 mode.
   *
   * @example
   * const adapter = app.getHttpAdapter() as H3Adapter;
   * if (adapter.isHttp2Enabled()) {
   *   console.log('Running with HTTP/2');
   * }
   *
   * @returns {boolean} True if HTTP/2 is enabled
   */
  isHttp2Enabled(): boolean;
}
