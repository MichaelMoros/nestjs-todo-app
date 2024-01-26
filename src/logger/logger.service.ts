import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
	return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

export const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
		logFormat
	),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
	],
});

@Injectable()
export class LoggerService {
	log(message: string) {
		logger.log('info', message);
	}

	error(message) {
		logger.error(message);
	}

	warn(message: string) {
		logger.warn(message);
	}

	debug(message: string) {
		logger.debug(message);
	}
}
