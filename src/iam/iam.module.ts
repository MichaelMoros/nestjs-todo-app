import { Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import AuthenticationController from './authentication/authentication.controller';
import { AuthenticationService } from './authentication/authentication.service';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from 'src/redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { RefreshTokenGuard } from './authentication/guards/refresh-token/refresh-token.guard';
import { NodemailerService } from 'src/nodemailer/nodemailer.service';
import { NodemailerModule } from 'src/nodemailer/nodemailer.module';
import { HabitsModule } from 'src/habits/habits.module';
import { UserModule } from 'src/user/user.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User]),
		JwtModule.registerAsync(jwtConfig.asProvider()),
		ConfigModule.forFeature(jwtConfig),
		RedisModule,
		NodemailerModule,
		HabitsModule,
		UserModule
	],
	providers: [
		{
			provide: HashingService,
			useClass: BcryptService
		},
		{
			provide: APP_GUARD,
			useClass: AuthenticationGuard
		},
		AccessTokenGuard,
		AuthenticationService,
		RefreshTokenGuard,
		NodemailerService,
		ConfigService
	],
	controllers: [AuthenticationController],
})
export class IamModule { }
