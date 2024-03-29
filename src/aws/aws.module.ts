import { Module } from '@nestjs/common';
import { AwsService } from './aws.service';
import { AwsController } from './aws.controller';

@Module({
	exports: [AwsService],
	providers: [AwsService],
	controllers: [AwsController]
})
export class AwsModule { }
