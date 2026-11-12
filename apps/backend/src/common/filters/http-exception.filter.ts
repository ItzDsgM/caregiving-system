import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter formatting all unhandled and HTTP exceptions into a standard JSON payload:
 * `{ statusCode, message, timestamp, path }`.
 * Catches TypeORM 22P02 invalid UUID syntax and maps it gracefully to 400 Bad Request.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Intercepts thrown exceptions across the application lifecycle and generates uniform JSON responses.
   *
   * @param exception - The caught exception (HttpException, TypeORM error, or general Error).
   * @param host - ArgumentsHost providing access to current HTTP request/response contexts.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'message' in res) {
        message = (res as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else if (
      (exception as any)?.code === '22P02' ||
      ((exception as Error)?.message &&
        (exception as Error).message.includes('invalid input syntax for type uuid'))
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid input syntax for UUID parameter';
      this.logger.warn(
        `Handled 22P02 invalid UUID syntax: ${(exception as Error).message}`,
      );
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    });
  }
}
