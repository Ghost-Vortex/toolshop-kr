import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Перехватчик журналирования. Фиксирует метод, путь, код ответа и время
 * обработки каждого запроса, а также добавляет заголовок X-Response-Time.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - startedAt;
        if (!response.headersSent) {
          response.setHeader('X-Response-Time', `${elapsed}ms`);
        }
        this.logger.log(
          `${request.method} ${request.originalUrl} ${response.statusCode} — ${elapsed} мс`,
        );
      }),
    );
  }
}
