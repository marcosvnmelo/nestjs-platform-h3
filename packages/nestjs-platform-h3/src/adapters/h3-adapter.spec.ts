import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import bodyParser from 'body-parser';
import { H3 } from 'h3';

import { BadRequestException } from '@nestjs/common';

import { H3Adapter } from './h3-adapter.ts';

describe('H3Adapter', () => {
  afterEach(() => {
    rs.restoreAllMocks();
  });
  let h3Adapter: H3Adapter;

  beforeEach(() => {
    h3Adapter = new H3Adapter();
  });

  describe('registerParserMiddleware', () => {
    it('should register the h3 built-in parsers for json and urlencoded payloads', () => {
      const h3Instance = new H3();
      const jsonParserInstance = bodyParser.json();
      const urlencodedInstance = bodyParser.urlencoded();
      const jsonParserSpy = rs
        .spyOn(bodyParser, 'json')
        .mockReturnValue(jsonParserInstance as any);
      const urlencodedParserSpy = rs
        .spyOn(bodyParser, 'urlencoded')
        .mockReturnValue(urlencodedInstance as any);
      const useSpy = rs.spyOn(h3Instance, 'use');
      const h3Adapter = new H3Adapter(h3Instance);
      useSpy.mockClear();

      h3Adapter.registerParserMiddleware();

      expect(useSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledWith(expect.any(Function));
      expect(jsonParserSpy).toHaveBeenCalledWith({});
      expect(urlencodedParserSpy).toHaveBeenCalledWith({ extended: true });
    });

    it('should register unified body parser middleware alongside existing stack', () => {
      const h3Instance = new H3();
      h3Instance.use(function jsonParser() {});
      h3Instance.use(function urlencodedParser() {});
      const useSpy = rs.spyOn(h3Instance, 'use');
      const h3Adapter = new H3Adapter(h3Instance);
      useSpy.mockClear();

      h3Adapter.registerParserMiddleware();

      expect(useSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('setErrorHandler', () => {
    it('should map parser errors before delegating to the error handler', async () => {
      const h3Instance = new H3();
      const h3Adapter = new H3Adapter(h3Instance);
      const handler = rs.fn();
      const req = {};
      const res = {};
      const event = {
        runtime: {
          node: {
            req,
            res,
          },
        },
      };

      h3Adapter.setErrorHandler(handler);

      await h3Instance.config.onError?.(
        new SyntaxError('invalid json') as any,
        event as any,
      );

      expect(handler).toHaveBeenCalledWith(
        expect.any(BadRequestException),
        req,
        res,
        expect.any(Function),
      );
    });
  });

  describe('mapException', () => {
    it('should map URIError with status code to BadRequestException', () => {
      const error = new URIError();
      const result = h3Adapter.mapException(error) as BadRequestException;
      expect(result).to.be.instanceOf(BadRequestException);
    });

    it('should map SyntaxError with status code to BadRequestException', () => {
      const error = new SyntaxError();
      const result = h3Adapter.mapException(error) as BadRequestException;
      expect(result).to.be.instanceOf(BadRequestException);
    });

    it('should return error if it is not handler Error', () => {
      const error = new Error('Test error');
      const result = h3Adapter.mapException(error);
      expect(result).to.equal(error);
    });
  });
});
