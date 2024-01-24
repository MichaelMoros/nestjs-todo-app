import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from 'src/iam/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/iam/constants/constants';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		@Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
	) { }

	async canActivate(
		context: ExecutionContext,
	): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const refreshToken = request.cookies['refreshToken']

		console.log({ refreshToken }, "from guard")
		if (!refreshToken) throw new UnauthorizedException()

		try {
			const payload = await this.jwtService.verifyAsync(
				refreshToken,
				this.jwtConfiguration
			)
			request[REQUEST_USER_KEY] = payload
		} catch (err) {
			console.log(err)
			throw new UnauthorizedException()
		}

		return true;
	}
}
