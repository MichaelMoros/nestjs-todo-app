import { IsNotEmpty } from "class-validator";

export class EndSessionDto {
    @IsNotEmpty()
    accessToken: string

    @IsNotEmpty()
    refreshToken: string
}