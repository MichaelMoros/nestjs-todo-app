import { BadRequestException } from '@nestjs/common';

class UserNotVerifiedException extends BadRequestException {
    constructor(message?: string) {
        super(message || 'User not found');
    }
}

class IncorrectOldPasswordException extends BadRequestException {
    constructor(message?: string) {
        super(message || `Failed to verify old password`);
    }
}

class InvalidImageUrlException extends BadRequestException {
    constructor(message?: string) {
        super(message || `Url must reference to an image resource`);
    }
}

export {
    UserNotVerifiedException,
    IncorrectOldPasswordException,
    InvalidImageUrlException
}