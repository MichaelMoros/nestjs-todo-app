import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from 'src/iam/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/iam/constants/constants';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';

@Injectable()
export class AccessTokenGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		@Inject(jwtConfig.KEY) private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
	) { }

	async canActivate(
		context: ExecutionContext,
	): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const accessToken = request.cookies['accessToken']

		if (!accessToken) throw new UnauthorizedException()

		try {
			const payload = await this.jwtService.verifyAsync(
				accessToken,
				this.jwtConfiguration
			)

			request[REQUEST_USER_KEY] = payload
		} catch (err) {
			throw new UnauthorizedException()
		}

		return true;
	}
}
