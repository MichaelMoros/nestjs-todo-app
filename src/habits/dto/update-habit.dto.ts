import { IsNotEmpty, IsOptional } from 'class-validator';
import { ProofType } from 'src/logs/enums/enum';


export class UpdateHabitDto {
	@IsOptional()
	file?: Express.Multer.File | null | undefined

	@IsNotEmpty()
	proof: string | 'User Acknowledgement'

	@IsOptional()
	note?: string

	@IsNotEmpty()
	proofType: ProofType
}
