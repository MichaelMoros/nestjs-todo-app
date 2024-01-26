import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as hbs from 'express-handlebars';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './filter/http-exception.filter';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	app.useGlobalPipes(new ValidationPipe())
	app.useStaticAssets(join(__dirname, '..', 'public'))
	app.setBaseViewsDir(join(__dirname, '..', 'views'));
	const _hbs = hbs.create({
		extname: 'hbs',
		helpers: {
			test: (s: string) => {
				return s.toUpperCase()
			}
		},
		partialsDir: 'views/partials'
	})

	app.setViewEngine('hbs');
	app.engine('hbs', _hbs.engine)
	app.use(cookieParser());
	app.enableCors({
		credentials: true,
		origin: process.env.FRONT_END_APP,
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
		optionsSuccessStatus: 204,
	});

	await app.listen(5000);

}
bootstrap();
