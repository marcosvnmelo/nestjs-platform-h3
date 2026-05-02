import { describe, expect, it } from '@rstest/core';

import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';

import { h3MultipartExceptions, transformException } from './multer.utils.js';

describe('transformException', () => {
  describe('if error does not exist', () => {
    it('should behave as identity', () => {
      const err = undefined;
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error is instance of HttpException', () => {
    it('should behave as identity', () => {
      const err = new HttpException('response', 500);
      expect(transformException(err)).toBe(err);
    });
  });
  describe('if error exists and is not instance of HttpException', () => {
    describe('and is LIMIT_FILE_SIZE exception', () => {
      it('should return "PayloadTooLargeException"', () => {
        const err = { message: h3MultipartExceptions.LIMIT_FILE_SIZE };
        expect(transformException(err as any)).toBeInstanceOf(
          PayloadTooLargeException,
        );
      });
    });
    describe('and is multer exception but not a LIMIT_FILE_SIZE', () => {
      it('should return "BadRequestException"', () => {
        const err = { message: h3MultipartExceptions.LIMIT_FIELD_KEY };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
    });
    describe('and is busboy/multipart exception', () => {
      it('should return "BadRequestException"', () => {
        const err = {
          message: h3MultipartExceptions.MULTIPART_BOUNDARY_NOT_FOUND,
        };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });

      it('should return "BadRequestException"', () => {
        const err = {
          message: h3MultipartExceptions.MULTIPART_UNEXPECTED_END_OF_FORM,
        };
        expect(transformException(err as any)).toBeInstanceOf(
          BadRequestException,
        );
      });
    });
    describe(`and has a 'field' property`, () => {
      it('should return the field propery appended to the error message', () => {
        const err = {
          message: h3MultipartExceptions.LIMIT_UNEXPECTED_FILE,
          field: 'foo',
        };
        expect(transformException(err as any)!.message).toBe(
          `${h3MultipartExceptions.LIMIT_UNEXPECTED_FILE} - foo`,
        );
      });
    });
  });
});
