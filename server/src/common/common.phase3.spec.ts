/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { of } from 'rxjs';
import { HttpStatus, HttpException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

describe('Phase 3: Common Infrastructure - Interceptors & Filters', () => {
  describe('TransformInterceptor', () => {
    let interceptor: TransformInterceptor;

    beforeEach(() => {
      interceptor = new TransformInterceptor();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should wrap response in { code: 200, message: "ok", data }', (done) => {
      const data = { id: 1, name: 'test' };
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(data)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          code: 200,
          message: 'ok',
          data,
        });
        done();
      });
    });

    it('should set data to null when handler returns null', (done) => {
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(null)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result.data).toBeNull();
        expect(result.code).toBe(200);
        done();
      });
    });

    it('should set data to null when handler returns undefined', (done) => {
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(undefined)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result.data).toBeNull();
        expect(result.code).toBe(200);
        done();
      });
    });

    it('should pass through array data unchanged', (done) => {
      const data = [{ id: 1 }, { id: 2 }];
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(data)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result.data).toEqual(data);
        expect(Array.isArray(result.data)).toBe(true);
        done();
      });
    });

    it('should pass through object data unchanged', (done) => {
      const data = { id: 1, name: 'test', nested: { value: 123 } };
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(data)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result.data).toEqual(data);
        done();
      });
    });

    it('should pass through primitive string data', (done) => {
      const data = 'success message';
      const callHandler = {
        handle: jest.fn().mockReturnValue(of(data)),
      };
      const context = {} as any;

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result.data).toBe(data);
        done();
      });
    });
  });

  describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let mockResponse: any;
    let mockHost: any;

    beforeEach(() => {
      filter = new HttpExceptionFilter();
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return status and string message for HttpException', () => {
      const exception = new HttpException('Bad Request', 400);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Bad Request',
        data: null,
      });
    });

    it('should extract message field from HttpException with object response', () => {
      const exception = new BadRequestException({
        message: 'Validation failed',
        error: 'Bad Request',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Validation failed',
        data: null,
      });
    });

    it('should use first element when message is an array', () => {
      const exception = new BadRequestException([
        'Field is required',
        'Field must be unique',
      ]);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        message: 'Field is required',
        data: null,
      });
    });

    it('should return 500 and "服务器内部错误" for non-HttpException', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 500,
        message: '服务器内部错误',
        data: null,
      });
    });

    it('should call response.status() with exception status code', () => {
      const exception = new ForbiddenException('Forbidden');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should always set data: null in error response body', () => {
      const exception = new HttpException('Not Found', 404);

      filter.catch(exception, mockHost);

      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.data).toBeNull();
    });
  });
});
