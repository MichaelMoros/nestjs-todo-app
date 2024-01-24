import { Controller, Get, Post, Body, Patch, Param, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenericValidationPipe } from 'src/habits/pipe/ValidationPipe';
import { FileSizeRule } from 'src/habits/validators/file-size.validation.rule';
import { FileNameRegexRule } from 'src/habits/validators/file-name.validation.rule';
import { UpdateAvatarDto } from './dto/update-avatar.dto';

@Auth(AuthType.AccessTokenJwt)
@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) { }

	@Get()
	async getCurrentUser(@ActiveUser() user: ActiveUserData) {
		return await this.userService.getUserById(user.sub)
	}

	@Post('avatar')
	@UseInterceptors(FileInterceptor('file'))
	async changeAvatar(
		@Body() updateAvatarDto: Partial<UpdateAvatarDto>,
		@ActiveUser() activeUser: ActiveUserData,
		@UploadedFile(
			new GenericValidationPipe([
				new FileSizeRule(5),
				new FileNameRegexRule()
			]),
		) file: Express.Multer.File) {

		const payload = { url: updateAvatarDto.url, file }
		const user = await this.userService.verifyUser({ id: activeUser.sub })
		return this.userService.changeAvatar(payload, user)
	}

	@Patch('change-password')
	async changeUserPassword(@Body() changePasswordDto: ChangePasswordDto, @ActiveUser() activeUser: ActiveUserData) {
		const user = await this.userService.verifyUser({ id: activeUser.sub })
		return this.userService.changePassword(changePasswordDto, user)
	}
}
