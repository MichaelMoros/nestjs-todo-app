import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly loggerService: LoggerService
    ) { }
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
            const errorInfo = {
                timestamp: new Date().toISOString(),
                method: request.method,
                route: request.originalUrl,
                headers: request.headers,
                query: request.query,
                ip: request.ip,
                payload: request.body,
                response: {
                    status,
                    message: exception.message || 'An unexpected error occurred. Please try again later.',
                },
            }

            this.loggerService.error(JSON.stringify(errorInfo))
        }

        response.status(status).json(exception.getResponse())
    }
}