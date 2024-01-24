import { IsNotEmpty, MinLength, Validate } from "class-validator";
import { DateRangeValidator } from '../validators/custom-date-range.validator';

export class CreateHabitDto {
	@MinLength(2)
	routine: string

	@IsNotEmpty()
	start: string

	@Validate(DateRangeValidator, ['start'])
	end: string
}
