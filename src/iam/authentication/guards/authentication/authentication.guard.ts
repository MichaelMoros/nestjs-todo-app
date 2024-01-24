import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthType } from '../../enums/auth-type.enum';
import { AUTH_TYPE_KEY } from '../../decorators/auth.decorator';
import { RefreshTokenGuard } from '../refresh-token/refresh-token.guard';

@Injectable()
export class AuthenticationGuard implements CanActivate {
	private static readonly defaultAuthType = AuthType.AccessTokenJwt

	constructor(
		private readonly reflector: Reflector,
		private readonly accessTokenGuard: AccessTokenGuard,
		private readonly refreshTokenGuard: RefreshTokenGuard
	) { }

	private readonly authTypeGuardMap: Record<AuthType, CanActivate | CanActivate[]> = {
		[AuthType.AccessTokenJwt]: this.accessTokenGuard,
		[AuthType.RefreshTokenJwt]: this.refreshTokenGuard,
		[AuthType.None]: { canActivate: () => true }
	}

	async canActivate(
		context: ExecutionContext,
	): Promise<boolean> {
		const authTypes = this.reflector.getAllAndOverride<AuthType[]>(AUTH_TYPE_KEY, [context.getHandler(), context.getClass()]) ?? [AuthenticationGuard.defaultAuthType]

		const guards = authTypes.map((type) => this.authTypeGuardMap[type]).flat()

		let error = new UnauthorizedException()

		for (const instance of guards) {
			const canActivate = await Promise.resolve(
				instance.canActivate(context)
			).catch((err) => {
				error = err
			})

			if (canActivate) return true
		}

		throw error
	}
}
