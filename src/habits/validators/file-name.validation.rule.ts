import { Injectable, BadRequestException } from '@nestjs/common';

interface ValidationRule {
	validate(value: any): void;
}

@Injectable()
export class FileNameRegexRule implements ValidationRule {
	private readonly regex: RegExp = /^[a-zA-Z0-9. _-]+$/;

	validate(value: any): void {
		if (!value) return
		const file = value;

		if (!this.regex.test(file.originalname)) {
			throw new BadRequestException('Invalid file name format');
		}
	}
}