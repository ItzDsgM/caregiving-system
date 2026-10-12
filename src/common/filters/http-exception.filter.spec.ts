import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/v1/auth/register' }),
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should format HttpException with the standard error envelope (RNF05)', () => {
    filter.catch(new ConflictException('Email is already registered'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Email is already registered',
      timestamp: expect.any(String),
      path: '/api/v1/auth/register',
    });
  });

  it('should preserve the array of messages produced by ValidationPipe', () => {
    filter.catch(new BadRequestException(['email must be an email', 'x']), host);

    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(['email must be an email', 'x']);
  });

  it('should fall back to exception.message when the response has no message key', () => {
    filter.catch(new HttpException('plain-string-response', 418), host);

    expect(status).toHaveBeenCalledWith(418);
    expect(json.mock.calls[0][0].message).toBe('plain-string-response');
  });

  it('should hide internal error details and log them for unknown Errors', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');

    filter.catch(new Error('relation "users" does not exist'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('relation');
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should return 500 for non-Error throwables without logging a stack', () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');

    filter.catch('boom', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json.mock.calls[0][0].message).toBe('Internal server error');
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  it('should emit a valid ISO timestamp', () => {
    filter.catch(new BadRequestException('x'), host);

    const { timestamp } = json.mock.calls[0][0];
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
