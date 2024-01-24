import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UtilitiesService } from 'src/utilities/utilities.service';
import { HashingService } from 'src/iam/hashing/hashing.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetCurrentUserDto } from './dto/get-current-user.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { AwsService } from 'src/aws/aws.service';
import { ConfigService } from '@nestjs/config';
import { IncorrectOldPasswordException, InvalidImageUrlException, UserNotVerifiedException } from './interfaces/UserException';
import { S3DeleteObjectsException, S3UploadException } from 'src/aws/interface/AwsExceptions';


@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		private readonly hashingService: HashingService,
		private readonly utilitiesService: UtilitiesService,
		private readonly awsService: AwsService,
		private readonly configService: ConfigService
	) { }

	async changeAvatar(updateAvatarDto: UpdateAvatarDto, user: User): Promise<void> {
		if (updateAvatarDto.file) {
			try {
				const uploadFileUrl = await this.awsService.uploadToS3(updateAvatarDto.file)
				const oldImageUrl = user.avatar
				user.avatar = uploadFileUrl

				const oldObjectKey = oldImageUrl.replace(this.configService.get("S3_BASE_URL"), "")
				const isFileUploadedToS3 = oldObjectKey !== oldImageUrl

				if (isFileUploadedToS3) {
					try {
						await this.awsService.deleteObjects(oldObjectKey)
					} catch (deleteError) {
						if (deleteError instanceof S3DeleteObjectsException) {
							throw new InternalServerErrorException("An error occured while deleting your old avatar")
						} else {
							throw new InternalServerErrorException('An unexpected error occurred. Please try again later.');
						}
					}
				}
			} catch (error) {
				if (error instanceof S3UploadException) {
					throw new InternalServerErrorException("An error occured while uploading your avatar. Please try again later.")
				} else {
					throw new InternalServerErrorException('An unexpected error occurred. Please try again later.');
				}
			}
		}

		else {
			if (!await this.utilitiesService.isValidImageLink(updateAvatarDto.url)) {
				throw new InvalidImageUrlException()
			}

			user.avatar = updateAvatarDto.url
		}

		await this.userRepository.save(user)
	}

	async changePassword(changePasswordDto: ChangePasswordDto, user: User) {
		if (!await this.hashingService.compare(changePasswordDto.oldPassword, user.password)) {
			throw new IncorrectOldPasswordException()
		}

		const hashedPassword = await this.hashingService.hash(changePasswordDto.newPassword)
		user.password = hashedPassword
		await this.userRepository.save(user)

		return { message: "Password updated successfully." }
	}

	async getUserById(id: number): Promise<Pick<User, Exclude<keyof User, "id" | "password" | "verifiedAt">>> {
		const user = await this.userRepository.findOneBy({ id });

		if (!user) throw new BadRequestException("User not found")
		const { id: userId, password, verifiedAt, ...other } = user

		return other
	}

	async verifyUser<K extends keyof User>(criteria: { [P in K]: User[P] }): Promise<User> {
		const user = await this.userRepository.findOneBy(criteria);
		if (!user || !user.isVerified) {
			throw new UserNotVerifiedException()
		}

		return user
	}
}
