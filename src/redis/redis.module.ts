import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import redisConfig from './config/redis.config';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
	exports: [RedisService],
	imports: [
		ConfigModule.forFeature(redisConfig)
	],
	providers: [RedisService, ConfigService]
})
export class RedisModule { }
