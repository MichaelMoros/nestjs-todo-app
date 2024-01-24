import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UnauthorizedException } from "@nestjs/common";
import { AuthenticationService } from "./authentication.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { Request, Response } from "express";
import { Auth } from "./decorators/auth.decorator";
import { AuthType } from "./enums/auth-type.enum";
import { Cookies } from "../decorators/cookie.decorator";
import { JsonWebTokenError, TokenExpiredError } from "@nestjs/jwt";
import { NodemailerService } from "src/nodemailer/nodemailer.service";
import { ActiveUser } from "../decorators/active-user.decorator";
import { ActiveUserData } from "../interfaces/active-user-data.interface";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendEmailDto } from "src/nodemailer/dto/send-email.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { HabitsService } from "src/habits/habits.service";
import { InvalidatedVerificationTokenError } from "src/redis/interfaces/TokenException.interface";

@Controller('auth')
export default class AuthenticationController {
	constructor(
		private readonly authenticationService: AuthenticationService,
		private readonly nodemailerService: NodemailerService,
		private readonly habitService: HabitsService
	) { }

	@Auth(AuthType.None)
	@Post('sign-up')
	async signUp(@Body() signUpDto: SignUpDto) {
		const savedUser = await this.authenticationService.create(signUpDto)
		const emailBody = await this.authenticationService.generateVerificationLink(savedUser)

		const payload: SendEmailDto = {
			email: savedUser.email,
			body: emailBody,
			subject: "Complete your registration"
		}

		await this.habitService.generateInitialData(savedUser.id)
		return await this.nodemailerService.sendEmailTo(payload)
	}

	@Auth(AuthType.None)
	@HttpCode(HttpStatus.OK)
	@Post('sign-in')
	async signIn(@Body() signInDto: SignInDto, @Res() res: Response) {
		const activeUser = await this.authenticationService.signIn(signInDto)
		const { refreshToken, accessToken } = activeUser

		// FIX ME: SYNCED TOKEN EXPIRY
		res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'none', secure: true, path: "/" })
		res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'none', secure: true, path: "/" })

		return res.json(activeUser)
	}

	@Auth(AuthType.None)
	@Get("verify-user")
	async verifyUser(@Res() res: Response, @Query('token') token: string) {
		try {
			await this.authenticationService.verifyVerificationLink(token)
			return res.render("verify-user", { layout: false, title: "Verify User", success: true, message: "Success, you may close this page now." })
		} catch (e) {
			let message

			if (e instanceof TokenExpiredError) message = "Token has expired."
			else if (e instanceof JsonWebTokenError) message = "JsonWebTokenError: " + e.message
			else if (e instanceof BadRequestException || e instanceof UnauthorizedException) message = e.message
			else if (e instanceof InvalidatedVerificationTokenError) message = "Token invalidated"
			else message = "Unexpected error: " + e.message

			return res.render("verify-user", { layout: false, title: "Verify User", success: false, message: message })
		}
	}

	@Auth(AuthType.AccessTokenJwt)
	@Get("resend-confirmation")
	async resendConfirmation(@ActiveUser() user: ActiveUserData) {
		const emailBody = await this.authenticationService.generateResendVerificationLink(user.email)

		const payload: SendEmailDto = {
			email: user.email,
			body: emailBody,
			subject: "Complete your registration"
		}

		return await this.nodemailerService.sendEmailTo(payload)
	}

	@Auth(AuthType.RefreshTokenJwt)
	@HttpCode(HttpStatus.OK)
	@Get('refresh-tokens')
	async refreshTokensGet(@Req() req: Request, @Res() res: Response, @Cookies('refreshToken') refreshToken: string) {
		const tokens = await this.authenticationService.refreshTokens({ token: refreshToken })

		res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 24 * 7 * 60 })
		res.cookie('accessToken', tokens.accessToken, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 60 })

		return res.json(tokens)
	}

	@Auth(AuthType.None)
	@HttpCode(HttpStatus.OK)
	@Post("create-password-reset")
	async sendPasswordLink(@Body() resetPasswordDto: ResetPasswordDto, @Res() response: Response) {
		const serviceResult: { success: boolean, text: null | string } = await this.authenticationService.sendPasswordLink(resetPasswordDto)

		if (serviceResult.success) {
			const payload: SendEmailDto = {
				email: resetPasswordDto.email,
				body: serviceResult.text,
				subject: "Complete your password reset request"
			}
			await this.nodemailerService.sendEmailTo(payload)
		}

		return response.json({ message: "Request done" })
	}

	@Auth(AuthType.None)
	@HttpCode(HttpStatus.OK)
	@Get("reset-password")
	async verifyResetPasswordUrl(@Query('token') token: string) {
		return await this.authenticationService.decodeRequestPasswordToken(token)
	}

	@Auth(AuthType.None)
	@HttpCode(HttpStatus.OK)
	@Post("reset-password")
	async resetPassword(@Query('token') token: string, @Body() forgotPasswordDto: ForgotPasswordDto) {
		return await this.authenticationService.forgotPasswordReset(forgotPasswordDto, token)
	}

	@Auth(AuthType.AccessTokenJwt)
	@Auth(AuthType.RefreshTokenJwt)
	@HttpCode(HttpStatus.OK)
	@Get('logout')
	async logoutSession(@Res() res: Response, @Cookies() cookies: string) {
		const payload = {
			accessToken: cookies['accessToken'],
			refreshToken: cookies['refreshToken']
		}

		await this.authenticationService.endSession(payload)

		res.clearCookie('accessToken')
		res.clearCookie('refreshToken')

		return res.json({ success: true })
	}
}