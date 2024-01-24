import { IsNotEmpty, MinLength } from "class-validator";

export class ForgotPasswordDto {
    @MinLength(6)
    password: string
}