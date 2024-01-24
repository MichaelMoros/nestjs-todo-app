import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

interface ValidationRule {
	validate(value: any): void;
}

@Injectable()
export class GenericValidationPipe implements PipeTransform {
	constructor(private readonly validations: ValidationRule[]) { }

	transform(value: any, metadata: ArgumentMetadata) {
		for (const validation of this.validations) {
			validation.validate(value);
		}

		return value;
	}
}