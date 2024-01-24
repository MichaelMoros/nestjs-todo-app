import { Module } from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [UtilitiesService],
})
export class UtilitiesModule { }
