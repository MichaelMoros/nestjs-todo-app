import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Habit } from 'src/habits/entities/habit.entity';
import { Log } from 'src/logs/entities/log.entity';
import { UtilitiesService } from 'src/utilities/utilities.service';
import { BcryptService } from 'src/iam/hashing/bcrypt.service';
import { HashingService } from 'src/iam/hashing/hashing.service';
import { UtilitiesModule } from 'src/utilities/utilities.module';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AwsService } from 'src/aws/aws.service';
import { ConfigService } from '@nestjs/config';

@Module({
	exports: [UserService],
	imports: [TypeOrmModule.forFeature([Habit, Log, User]), HttpModule],
	controllers: [UserController],
	providers: [
		UserService,
		UtilitiesService,
		AwsService,
		{
			provide: HashingService,
			useClass: BcryptService
		},
		ConfigService
	],
})
export class UserModule { }
