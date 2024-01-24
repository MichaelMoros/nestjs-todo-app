class InvalidatedRefreshTokenError extends Error { }
class InvalidatedResetPasswordTokenError extends Error { }
class InvalidatedVerificationTokenError extends Error { }

export {
    InvalidatedRefreshTokenError,
    InvalidatedVerificationTokenError,
    InvalidatedResetPasswordTokenError
}