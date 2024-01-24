import { HttpException, HttpStatus } from "@nestjs/common";

class S3UploadException extends HttpException {
	constructor(message: string, code: number = HttpStatus.INTERNAL_SERVER_ERROR) {
		super({ message }, code);
	}
}

class S3DeleteObjectsException extends HttpException {
	constructor(message: string, code: number = HttpStatus.INTERNAL_SERVER_ERROR) {
		super({ message }, code);
	}
}

export {
	S3UploadException,
	S3DeleteObjectsException
}