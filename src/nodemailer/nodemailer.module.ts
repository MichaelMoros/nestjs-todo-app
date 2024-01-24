import { Module } from '@nestjs/common';
import { NodemailerService } from './nodemailer.service';
import { ConfigService } from '@nestjs/config';

@Module({
	imports: [],
	providers: [NodemailerService, ConfigService]
})

export class NodemailerModule { }
