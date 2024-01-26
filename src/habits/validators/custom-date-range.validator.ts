import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
	validate(start: Date, args: ValidationArguments): boolean {
		const end = args.object[args.constraints[0]];

		const parsedStart = new Date(start);
		const parsedEnd = new Date(end);

		if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
			return false;
		}

		return parsedEnd < parsedStart;
	}

	defaultMessage(args: ValidationArguments): string {
		return 'Start date must be before or equal to the end date';
	}
}
