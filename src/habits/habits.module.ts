import { Module } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Habit } from './entities/habit.entity';
import { Log } from 'src/logs/entities/log.entity';
import { AwsService } from 'src/aws/aws.service';
import { UtilitiesModule } from 'src/utilities/utilities.module';
import { HttpModule } from '@nestjs/axios';
import { UtilitiesService } from 'src/utilities/utilities.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';

@Module({
	exports: [HabitsService],
	imports: [TypeOrmModule.forFeature([User, Habit, Log]), HttpModule, UtilitiesModule, UserModule],
	controllers: [HabitsController],
	providers: [HabitsService, AwsService, UtilitiesService],
})
export class HabitsModule { }
