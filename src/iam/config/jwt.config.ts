import { registerAs } from "@nestjs/config";

export default registerAs('jwt', () => {
	return {
		secret: process.env.JWT_SECRET,
		verificationSecret: process.env.JWT_VERIFICATION_TOKEN_SECRET,
		resetPasswordSecret: process.env.JWT_RESET_PASSWORD_TOKEN_SECRET,
		audience: process.env.JWT_AUDIENCE,
		issuer: process.env.JWT_ISSUER,
		accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '300', 10),
		refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '86400', 10),
		verificationTtl: parseInt(process.env.JWT_VERIFICATION_TOKEN_EXPIRATION ?? "21600", 10),
		resetPasswordTtl: parseInt(process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRATION ?? "21600", 10)
	}
})