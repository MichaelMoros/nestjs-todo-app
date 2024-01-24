import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import redisConfig from './config/redis.config';
import { ConfigService, ConfigType } from '@nestjs/config';
import { InvalidatedRefreshTokenError, InvalidatedResetPasswordTokenError, InvalidatedVerificationTokenError } from './interfaces/TokenException.interface';

@Injectable()
export class RedisService implements OnApplicationBootstrap, OnApplicationShutdown {
	constructor(
		@Inject(redisConfig.KEY) private readonly redisConfiguration: ConfigType<typeof redisConfig>,
		private readonly configService: ConfigService
	) { }
	private redisClient: Redis

	onApplicationBootstrap() {
		this.redisClient = new Redis({
			host: this.redisConfiguration.host,
			port: this.redisConfiguration.port,
		})
	}

	onApplicationShutdown(signal?: string) {
		return this.redisClient.quit()
	}

	async insertRefreshTokenId(userId: number, token: string): Promise<void> {
		await this.redisClient.set(this.getRefreshTokenKey(userId), token)
	}

	async validRefreshTokenId(userId: number, tokenId: string): Promise<boolean> {
		const storedId = await this.redisClient.get(this.getRefreshTokenKey(userId))
		if (storedId !== tokenId) throw new InvalidatedRefreshTokenError()
		return storedId === tokenId
	}

	async invalidateRefreshTokenId(userId: number): Promise<void> {
		await this.redisClient.del(this.getRefreshTokenKey(userId))
	}

	private getRefreshTokenKey(userId: number): string {
		return `user-${userId}`
	}

	private _getVerificationKey(email: string): string {
		return `verification-${email}`
	}

	async getVerificationKey(email: string): Promise<string> {
		return await this.redisClient.get(this._getVerificationKey(email))
	}

	async insertVerificationKey(email: string, id: string): Promise<"OK"> {
		const expiration = (parseInt(this.configService.get("JWT_VERIFICATION_TOKEN_EXPIRATION" ?? "21600"), 10) + 5) * 1000
		return await this.redisClient.set(this._getVerificationKey(email), id, "EX", expiration)
	}

	async validateVerificationToken(email: string, tokenId: string): Promise<boolean> {
		const storedId = await this.redisClient.get(this._getVerificationKey(email))
		if (storedId !== tokenId) throw new InvalidatedVerificationTokenError()
		return storedId === tokenId
	}

	async invalidateVerificationToken(email: string): Promise<void> {
		await this.redisClient.del(this._getVerificationKey(email))
	}

	private _getResetPasswordKey(email: string): string {
		return `reset-${email}`
	}

	async getResetPasswordKey(email: string): Promise<string> {
		return await this.redisClient.get(this._getResetPasswordKey(email))
	}

	async invalidateResetPasswordToken(email: string): Promise<void> {
		await this.redisClient.del(this._getResetPasswordKey(email))
	}

	async validateResetPasswordToken(email: string, tokenId: string): Promise<boolean> {
		const storedId = await this.redisClient.get(this._getResetPasswordKey(email))
		if (storedId !== tokenId) throw new InvalidatedResetPasswordTokenError()
		return storedId === tokenId
	}

	async insertResetPasswordKey(email: string, id: string): Promise<"OK"> {
		const expiration = (parseInt(this.configService.get("JWT_RESET_PASSWORD_TOKEN_EXPIRATION" ?? "21600"), 10) + 5) * 1000
		return await this.redisClient.set(this._getResetPasswordKey(email), id, "EX", expiration)
	}

}
