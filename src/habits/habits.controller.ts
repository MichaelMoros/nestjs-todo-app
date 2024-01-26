import { Controller, Get, Post, Body, Param, Delete, UploadedFile, Res, UseInterceptors } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenericValidationPipe } from './pipe/ValidationPipe';
import { FileSizeRule } from './validators/file-size.validation.rule';
import { FileNameRegexRule } from './validators/file-name.validation.rule';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';
import { UserService } from 'src/user/user.service';

@Auth(AuthType.AccessTokenJwt)
@Controller('habits')
export class HabitsController {
	constructor(
		private readonly habitsService: HabitsService,
		private readonly userService: UserService
	) { }

	@Get()
	async findAll(@ActiveUser() user: ActiveUserData, @Res() res: Response) {
		const habits = await this.habitsService.findAll(user.sub);
		// THIS IS BAD
		const userData = await this.userService.getUserById(user.sub)
		return res.json({
			owner: userData,
			data: habits
		})
	}

	@Post()
	async create(@Body() createHabitDto: CreateHabitDto, @ActiveUser() activeUser: ActiveUserData) {
		const user = await this.userService.verifyUser({ id: activeUser.sub })
		return this.habitsService.create(createHabitDto, user);
	}

	@Delete(':id')
	async updateHabit(@Param('id') id: string, @ActiveUser() activeUser: ActiveUserData) {
		const user = await this.userService.verifyUser({ id: activeUser.sub })
		const habit = await this.habitsService.findHabitAndCheckOwnership(user, +id)
		return this.habitsService.deleteHabit(habit, user)
	}

	@Post(':id')
	@UseInterceptors(FileInterceptor('file'))
	async uploadFile(
		@ActiveUser() activeUser: ActiveUserData,
		@Param('id') id: string,
		@Body() updateHabitDto: UpdateHabitDto,
		@UploadedFile(
			new GenericValidationPipe([
				new FileSizeRule(5),
				new FileNameRegexRule()
			])
		) file: Express.Multer.File
	) {

		const user = await this.userService.verifyUser({ id: activeUser.sub })
		const habit = await this.habitsService.findHabitAndCheckOwnership(user, +id)

		const updateHabitDtoWithFile = {
			...updateHabitDto,
			file
		}

		return await this.habitsService.updateHabitLog(updateHabitDtoWithFile, habit, user)
	}
}
