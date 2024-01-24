import { IsNotEmpty } from "class-validator";

export class GetCurrentUserDto {
    @IsNotEmpty()
    id: number
}