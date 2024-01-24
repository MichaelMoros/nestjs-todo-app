import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from "nodemailer"
import * as Mail from 'nodemailer/lib/mailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class NodemailerService {
    private nodemailerTransport: Mail
    constructor(
        private readonly configService: ConfigService,
    ) {
        this.nodemailerTransport = createTransport({
            service: this.configService.get('EMAIL_SERVICE'),
            auth: {
                user: this.configService.get('EMAIL_ADDRESS'),
                pass: this.configService.get('EMAIL_APP_PASSWORD'),
            }
        });
    }

    private sendMail(options: Mail.options) {
        return this.nodemailerTransport.sendMail(options)
    }

    async sendEmailTo(sendEmailDto: SendEmailDto) {
        return await this.sendMail({
            to: sendEmailDto.email,
            subject: sendEmailDto.subject,
            text: sendEmailDto.body
        })
    }
}
