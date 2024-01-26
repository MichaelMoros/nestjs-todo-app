import { Repository } from "typeorm"
import { HashingService } from "../hashing/hashing.service"
import { InjectRepository } from "@nestjs/typeorm"
import { User } from "src/user/entities/user.entity"
import { SignUpDto } from "./dto/sign-up.dto"
import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common"
import { SignInDto } from "./dto/sign-in.dto"
import { JsonWebTokenError, JwtService, TokenExpiredError } from "@nestjs/jwt"
import jwtConfig from "../config/jwt.config"
import { ConfigService, ConfigType } from "@nestjs/config"
import { RedisService } from "src/redis/redis.service"
import { randomUUID } from "crypto"
import { ActiveUserData } from "../interfaces/active-user-data.interface"
import { RefreshTokenDto } from "./dto/refresh-token.dto"
import { RefreshTokenData } from "../interfaces/refresh-token-data.interface"
import { EndSessionDto } from "./dto/end-session.dto"
import { ResetPasswordDto } from "./dto/reset-password.dto"
import { ForgotPasswordDto } from "./dto/forgot-password.dto"
import { UserService } from "src/user/user.service"
import { InvalidatedRefreshTokenError, InvalidatedResetPasswordTokenError } from "src/redis/interfaces/TokenException.interface"
import { VerificationTokenData } from "../interfaces/verification-token-data.interface"
import { ResetPasswordTokenData } from "../interfaces/reset-password-token-data.interface"

@Injectable()
export class AuthenticationService {
	constructor(
		private readonly hashingService: HashingService,
		private readonly jwtService: JwtService,
		private readonly redisService: RedisService,
		private readonly configService: ConfigService,
		private readonly userService: UserService,
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
	) { }

	async create(signUpDto: SignUpDto): Promise<User> {
		try {
			const user = new User()
			user.email = signUpDto.email
			user.password = await this.hashingService.hash(signUpDto.password)
			const savedUser = await this.userRepository.save(user)
			return savedUser
		} catch (err) {
			const pgUniqueErrorCode = '23505'

			if (err.code === pgUniqueErrorCode) {
				throw new ConflictException()
			} else {
				throw new InternalServerErrorException(err.message)
			}
		}
	}

	async signIn(signInDto: SignInDto): Promise<{ accessToken: string, refreshToken: string, data: Pick<User, Exclude<keyof User, "id" | "password" | "verifiedAt">> }> {
		const user = await this.userRepository.findOneBy({ email: signInDto.email })

		if (!user) throw new BadRequestException("User not found")

		const isVerified = await this.hashingService.compare(signInDto.password, user.password)
		if (!isVerified) throw new UnauthorizedException()

		const tokens = await this.generateAccessAndRefreshToken(user)

		const { id, password, verifiedAt, ...other } = user

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			data: other
		}
	}

	async generateAccessAndRefreshToken(user: User) {
		const refreshTokenId = randomUUID()

		const [accessToken, refreshToken] = await Promise.all(
			[
				this.createSignedToken<Partial<ActiveUserData>>(user.id, this.jwtConfiguration.accessTokenTtl, this.jwtConfiguration.secret, { email: user.email }),
				this.createSignedToken<Partial<RefreshTokenData>>(user.id, this.jwtConfiguration.refreshTokenTtl, this.jwtConfiguration.secret, { refreshTokenId })
			]
		)

		await this.redisService.insertRefreshTokenId(user.id, refreshTokenId)

		return {
			accessToken,
			refreshToken
		}
	}

	private createSignedToken<T>(userId: number, expiresIn: number, secret: string, payload?: T) {
		return this.jwtService.signAsync(
			{
				sub: userId,
				...payload
			},
			{
				audience: this.jwtConfiguration.audience,
				issuer: this.jwtConfiguration.issuer,
				secret,
				expiresIn
			})
	}

	private verifySignedToken<T extends object>(token: string, secret: string): Promise<T> {
		return this.jwtService.verifyAsync<T>(token, {
			audience: this.jwtConfiguration.audience,
			issuer: this.jwtConfiguration.issuer,
			secret
		})
	}

	async refreshTokens(refreshTokenDto: RefreshTokenDto) {
		try {
			const result: Partial<RefreshTokenData> = await this.verifySignedToken(refreshTokenDto.token, this.jwtConfiguration.secret)

			const user = await this.userRepository.findOneByOrFail({ id: result.sub })
			const isValid = await this.redisService.validRefreshTokenId(user.id, result.refreshTokenId)

			if (isValid) {
				await this.redisService.invalidateRefreshTokenId(user.id)
			} else {
				throw new UnauthorizedException('Refresh Token is expired.')
			}

			return this.generateAccessAndRefreshToken(user)
		} catch (err) {
			if (err instanceof InvalidatedRefreshTokenError) {
				throw new UnauthorizedException('Invalidated refresh tokens')
			} else {
				throw new UnauthorizedException(err.message)
			}
		}
	}

	async endSession(endSessionDto: EndSessionDto) {
		try {
			const { sub, refreshTokenId }: Pick<ActiveUserData, 'sub'> & { refreshTokenId: string } = await this.verifySignedToken(endSessionDto.refreshToken, this.jwtConfiguration.secret)
			const { sub: refreshTokenSub }: Pick<ActiveUserData, 'sub'> = await this.verifySignedToken(endSessionDto.accessToken, this.jwtConfiguration.secret)

			if (sub !== refreshTokenSub) {
				throw new UnauthorizedException("Access and Refresh doesn't match")
			}

			const user = await this.userRepository.findOneByOrFail({ id: sub })

			const isValid = await this.redisService.validRefreshTokenId(user.id, refreshTokenId)

			if (isValid) {
				await this.redisService.invalidateRefreshTokenId(user.id)
			} else {
				throw new UnauthorizedException('Access Token is expired')
			}
		} catch (err) {
			if (err instanceof InvalidatedRefreshTokenError) {
				throw new UnauthorizedException('Invalid Token.')
			}
		}
	}

	async verifyVerificationLink(token: string) {
		if (!token) {
			throw new BadRequestException("Missing token.")
		}

		const decodedToken: Partial<VerificationTokenData> = await this.verifySignedToken(token, this.jwtConfiguration.verificationSecret)

		const foundUser = await this.userRepository.findOneByOrFail({ email: decodedToken.email })

		if (foundUser.isVerified) {
			throw new BadRequestException("User is already verified")
		}

		const isValid = await this.redisService.validateVerificationToken(foundUser.email, decodedToken.verifyTokenId)

		if (!isValid) {
			throw new UnauthorizedException("Invalid claim")
		}

		foundUser.isVerified = true
		foundUser.verifiedAt = new Date()

		await this.userRepository.save(foundUser)
	}

	async generateVerificationLink(user: User): Promise<string> {
		const verifyTokenId = randomUUID()

		const payload = { email: user.email, verifyTokenId }
		const token = await this.createSignedToken<Partial<VerificationTokenData>>(user.id, this.jwtConfiguration.verificationTtl, this.jwtConfiguration.verificationSecret, payload)

		const redisKey = await this.redisService.getVerificationKey(user.email)

		if (redisKey) {
			// TODO: Limit number of request
			await this.redisService.invalidateVerificationToken(user.email)
		}

		await this.redisService.insertVerificationKey(user.email, verifyTokenId)
		const url = this.configService.get("SERVER_BASE_URL") + "/auth/verify-user?token=" + token
		const text = "Welcome to the Routine App. Complete your registeration by click this this link: " + url

		return text
	}

	async generateResendVerificationLink(email: string) {
		const user = await this.userRepository.findOneByOrFail({ email })

		if (user.isVerified) throw new BadRequestException("User is already verified.")

		return await this.generateVerificationLink(user)
	}

	async sendPasswordLink(resetPasswordDto: ResetPasswordDto) {
		if (!resetPasswordDto.email) {
			throw new BadRequestException("Email is missing")
		}

		const user = await this.userRepository.findOneBy({ email: resetPasswordDto.email })

		if (!user) return { success: false, text: null }

		const resetPasswordTokenId = randomUUID()

		const payload = { email: user.email, resetPasswordTokenId }

		const token = await this.createSignedToken<Partial<ResetPasswordTokenData>>(user.id, this.jwtConfiguration.resetPasswordTtl, this.jwtConfiguration.resetPasswordSecret, payload)

		const redisKey = await this.redisService.getResetPasswordKey(user.email)

		if (redisKey) {
			// TODO: Limit number of request
			await this.redisService.invalidateResetPasswordToken(user.email)
		}

		await this.redisService.insertResetPasswordKey(user.email, resetPasswordTokenId)

		const url = this.configService.get("FRONT_END_APP") + "/reset-password?token=" + token
		const text = "We received your password reset request. Click the link below to create a new password: " + url

		return { success: true, text }
	}

	async decodeRequestPasswordToken(token: string) {
		try {
			const decodedToken: Partial<ResetPasswordTokenData> = await this.verifySignedToken(token, this.jwtConfiguration.resetPasswordSecret)

			await this.redisService.validateResetPasswordToken(decodedToken.email, decodedToken.resetPasswordTokenId)
			return { success: true }
		} catch (e) {
			if (e instanceof TokenExpiredError || e instanceof JsonWebTokenError || e instanceof InvalidatedResetPasswordTokenError) {
				throw new UnauthorizedException(e.message)
			} else {
				throw new InternalServerErrorException(e.message)
			}
		}
	}

	async forgotPasswordReset(forgotPasswordDto: ForgotPasswordDto, token: string) {
		try {
			const decodedToken: Partial<ResetPasswordTokenData> = await this.verifySignedToken(token, this.jwtConfiguration.resetPasswordSecret)

			const user = await this.userRepository.findOneBy({ email: decodedToken.email })
			if (!user) throw new BadRequestException("User not found")

			await this.redisService.validateResetPasswordToken(decodedToken.email, decodedToken.resetPasswordTokenId)

			const hashedPassword = await this.hashingService.hash(forgotPasswordDto.password)
			user.password = hashedPassword
			await this.userRepository.save(user)
			await this.redisService.invalidateResetPasswordToken(decodedToken.email)
		} catch (e) {
			if (e instanceof TokenExpiredError || e instanceof JsonWebTokenError || e instanceof InvalidatedResetPasswordTokenError) {
				throw new UnauthorizedException(e.message)
			} else {
				throw new InternalServerErrorException(e.message)
			}
		}
	}

	async getAll() {
		return this.userRepository.find({})
	}
}