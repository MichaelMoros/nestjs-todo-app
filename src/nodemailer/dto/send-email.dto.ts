import { IsEmail, IsNotEmpty } from "class-validator";

export class SendEmailDto {
    @IsEmail()
    email: string

    @IsNotEmpty()
    body: string

    @IsNotEmpty()
    subject: string
}