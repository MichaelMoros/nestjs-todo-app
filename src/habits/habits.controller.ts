import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, Res, UseInterceptors, ParseFilePipe, UsePipes, Put, Req, BadRequestException } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { Request, Response } from 'express';
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
	create(@Body() createHabitDto: CreateHabitDto, @ActiveUser() user: ActiveUserData) {
		return this.habitsService.create(createHabitDto, user.sub);
	}

	@Delete(':id')
	updateHabit(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
		return this.habitsService.deleteHabit(+id, user.sub)
	}

	@Post(':id')
	@UseInterceptors(FileInterceptor('file'))
	async uploadFile(
		@ActiveUser() user: ActiveUserData,
		@Param('id') id: string,
		@Res() res: Response,
		@Body() updateHabitDto: UpdateHabitDto,
		@UploadedFile(
			new GenericValidationPipe([
				new FileSizeRule(5),
				new FileNameRegexRule()
			])
		) file: Express.Multer.File
	) {

		const updateHabitDtoWithFile = {
			...updateHabitDto,
			file
		}

		await this.habitsService.updateHabitLog(updateHabitDtoWithFile, +id, user.sub)
		return res.status(200).json({ success: true })
	}
}
