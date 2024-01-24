import { IsOptional } from "class-validator";

export class UpdateAvatarDto {
	@IsOptional()
	url: string

	@IsOptional()
	file: Express.Multer.File
}