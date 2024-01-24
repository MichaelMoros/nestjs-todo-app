import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { IamModule } from './iam/iam.module';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { HabitsModule } from './habits/habits.module';
import { LogsModule } from './logs/logs.module';
import { DatabaseModule } from './database/database.module';
import { AwsModule } from './aws/aws.module';
import { UtilitiesModule } from './utilities/utilities.module';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from './logger/logger.module';
import { NodemailerModule } from './nodemailer/nodemailer.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule,
		UserModule,
		IamModule,
		RedisModule,
		HabitsModule,
		LogsModule,
		DatabaseModule,
		AwsModule,
		UtilitiesModule,
		HttpModule,
		LoggerModule,
		NodemailerModule
	],
	controllers: [AppController]
})
export class AppModule { }
