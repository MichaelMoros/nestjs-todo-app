import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

interface ValidationRule {
	validate(value: any): void;
}

@Injectable()
export class FileSizeRule implements ValidationRule {
	constructor(private readonly maxSize: number) { }

	validate(value: any): void {
		if (!value) return
		const maxSize = this.maxSize * 1024 * 1024
		const file = value;

		if (file.size > maxSize) {
			throw new BadRequestException(`File size exceeds the limit (${this.maxSize} mb)`);
		}
	}
}