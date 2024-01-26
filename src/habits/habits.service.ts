import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Habit } from './entities/habit.entity';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Log } from 'src/logs/entities/log.entity';
import { AwsService } from 'src/aws/aws.service';
import { RoutineStatus } from './enums/routine-status.enum';
import { ProofType, UserAction, UserProof } from 'src/logs/enums/enum';
import { UtilitiesService } from 'src/utilities/utilities.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class HabitsService {
	constructor(
		@InjectRepository(Habit) private readonly habitRepository: Repository<Habit>,
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(Log) private readonly logRepository: Repository<Log>,
		private readonly awsService: AwsService,
		private readonly connection: DataSource,
		private readonly utilitiesService: UtilitiesService,
		private readonly userService: UserService
	) { }

	async findAll(id: number) {
		return await this.habitRepository
			.createQueryBuilder('habit')
			.where("habit.user.id = :id", { id })
			.leftJoinAndSelect('habit.logs', 'log')
			.leftJoinAndSelect('habit.user', 'user')
			.orderBy('log.createdAt', 'DESC')
			.getMany();
	}

	async create(createHabitDto: CreateHabitDto, user: User) {
		const startDate = new Date(createHabitDto.start)
		const endDate = new Date(createHabitDto.end)

		if (endDate.getTime() < startDate.getTime()) {
			throw new BadRequestException("End date must be greater than start date.")
		}

		const queryRunner = this.connection.createQueryRunner()
		await queryRunner.connect()
		await queryRunner.startTransaction()

		try {
			const habit = this.habitRepository.create({
				routine: createHabitDto.routine,
				start: startDate,
				end: endDate,
				user,
			})

			await queryRunner.manager.save(habit)

			const newLogData: DeepPartial<Log> = {
				user,
				habits: [habit],
				action: UserAction.Create,
				proof: UserProof.UserConfirmation,
				proofType: ProofType.Text,
			};

			const newLog = this.logRepository.create(newLogData)
			await queryRunner.manager.save(newLog)
			await queryRunner.commitTransaction();
		} catch (e) {
			await queryRunner.rollbackTransaction();
			throw new InternalServerErrorException(e.message)
		} finally {
			await queryRunner.release()
		}
	}

	async deleteHabit(habit: Habit, user: User) {
		if (habit.status === RoutineStatus.InProgress) {
			const queryRunner = this.connection.createQueryRunner()
			await queryRunner.connect()
			await queryRunner.startTransaction()

			try {

				habit.status = RoutineStatus.Deleted
				await queryRunner.manager.save(habit)

				const newLogData: DeepPartial<Log> = {
					user,
					habits: [habit],
					action: UserAction.Delete,
					proof: UserProof.UserConfirmation,
					proofType: ProofType.Text
				};

				const newLog = this.logRepository.create(newLogData);
				await queryRunner.manager.save(newLog)
				await queryRunner.commitTransaction();
			} catch (e) {
				await queryRunner.rollbackTransaction();
				throw new InternalServerErrorException(e.message)
			} finally {
				await queryRunner.release()
			}
		}

		else if (habit.status === RoutineStatus.Deleted) {
			const queryRunner = this.connection.createQueryRunner()
			await queryRunner.connect()
			await queryRunner.startTransaction()

			const habitWithLogs = await this.habitRepository.findOne({ where: { id: habit.id }, relations: ['logs'] });

			try {
				const objectsToDelete = habitWithLogs.logs
					.filter((item: Log) => item.proofType === ProofType.Image)
					.map((item) => item.proof.replace(process.env.S3_BASE_URL, ""))
					.map((item) => this.utilitiesService.replaceEncodedCharacters(item))
					.filter((item) => item !== "default.jpg")

				if (objectsToDelete.length > 0) {
					await this.awsService.deleteObjects(objectsToDelete)
				}

				await queryRunner.manager.remove(Habit, habitWithLogs)
				await queryRunner.manager.remove(Log, habitWithLogs.logs)
				await queryRunner.commitTransaction();
			} catch (e) {
				await queryRunner.rollbackTransaction();
				throw new InternalServerErrorException(e.message)
			} finally {
				await queryRunner.release()
			}
		}
	}

	async updateHabitLog(updateHabitDto: UpdateHabitDto, habit: Habit, user: User) {
		if (!this.utilitiesService.isMoreThanTimeApart(habit.lastTouch, 86400000)) {
			throw new BadRequestException(`Next update must be submitted after 24 hours`)
		}

		const shouldIncrementStreak = this.utilitiesService.isMoreThanTimeApart(habit.nextTouch, 86400000 * 2) ? false : true

		const newLogData: DeepPartial<Log> = {
			user,
			habits: [habit],
			action: UserAction.Update,
			proofType: ProofType.Text,
			proof: UserProof.UserConfirmation,
			note: updateHabitDto.note
		};

		if (updateHabitDto.proofType === ProofType.Link) {
			if (!await this.utilitiesService.isValidUrl(updateHabitDto.proof)) {
				throw new BadRequestException(`Url must be valid`)
			}
			newLogData.proofType = ProofType.Link
			newLogData.proof = updateHabitDto.proof
		}

		if (updateHabitDto.proofType === ProofType.Image) {
			if (!updateHabitDto.file) throw new BadRequestException("Missing File.")

			const photoUrl = await this.awsService.uploadToS3(updateHabitDto.file);
			newLogData.proofType = ProofType.Image
			newLogData.proof = photoUrl
		}

		const queryRunner = this.connection.createQueryRunner()
		await queryRunner.connect()

		try {
			await queryRunner.startTransaction()
			habit.streak = shouldIncrementStreak ? habit.streak + 1 : 0;
			await queryRunner.manager.save(habit);
			const newLog = this.logRepository.create(newLogData);
			await queryRunner.manager.save(newLog);
			await queryRunner.commitTransaction();
		} catch (e) {
			await queryRunner.rollbackTransaction();
			throw new InternalServerErrorException(e.message);
		} finally {
			await queryRunner.release();
		}
	}

	async findHabitAndCheckOwnership(user: User, id: number) {
		const habit = await this.habitRepository.findOne({ where: { id }, relations: ['user'] })
		if (!habit) throw new BadRequestException()
		if (habit.user.id !== user.id) throw new UnauthorizedException(`This object doesn't belong this user.`)

		return habit
	}

	async generateInitialData(userId: number) {
		const user = await this.userRepository.findOneBy({ id: userId })

		if (!user) throw new InternalServerErrorException("This method is meant to run after creating a new user. User not found.")

		const queryRunner = this.connection.createQueryRunner()
		await queryRunner.connect()
		await queryRunner.startTransaction()

		const startTime = new Date()
		const firstTimestamp = new Date(startTime.getTime() - 300);
		const secondTimestamp = new Date(startTime.getTime() - 200);
		const thirdTimestamp = new Date(startTime.getTime() - 100);
		const fourthTimestamp = new Date(startTime.getTime());

		try {
			const draft = this.habitRepository.create({
				routine: "Welcome to Routinee App",
				start: startTime,
				end: new Date(startTime.getFullYear(), 11, 31),
				nextTouch: new Date(startTime.getTime() - 25 * 60 * 60 * 1000),
				lastTouch: startTime,
				user
			})

			const savedItem = await queryRunner.manager.save(draft)

			const createLog: DeepPartial<Log> = {
				user,
				habits: [savedItem],
				action: UserAction.Create,
				proof: UserProof.UserConfirmation,
				proofType: ProofType.Text,
				createdAt: firstTimestamp
			};

			savedItem.streak = 0
			const newLog = this.logRepository.create(createLog)
			await queryRunner.manager.save(newLog)

			const updateLogTextExample: DeepPartial<Log> = {
				user,
				habits: [savedItem],
				action: UserAction.Update,
				proof: UserProof.UserConfirmation,
				proofType: ProofType.Text,
				note: "You can also add additional note for context",
				createdAt: secondTimestamp
			};

			savedItem.streak = 1
			const firstUpdateLog = this.logRepository.create(updateLogTextExample)
			await queryRunner.manager.save(firstUpdateLog)


			const updateLogLinkProofExample: DeepPartial<Log> = {
				user,
				habits: [savedItem],
				action: UserAction.Update,
				proof: "https://github.com/MichaelMoros/nestjs-demo-app",
				proofType: ProofType.Link,
				note: "You can use link as proof to reference online material such as blogs or post elsewhere",
				createdAt: thirdTimestamp
			};

			savedItem.streak = 2
			const secondUpdateLog = this.logRepository.create(updateLogLinkProofExample)
			await queryRunner.manager.save(secondUpdateLog)

			const updateLogFileProofExample: DeepPartial<Log> = {
				user,
				habits: [savedItem],
				action: UserAction.Update,
				proof: "https://nestjs-app.s3.ap-southeast-1.amazonaws.com/default.jpg",
				proofType: ProofType.Image,
				note: "You can also upload images per routine, and image per log",
				createdAt: fourthTimestamp
			};

			savedItem.streak = 3
			await queryRunner.manager.save(savedItem)
			const thirdUpdateLog = this.logRepository.create(updateLogFileProofExample)
			await queryRunner.manager.save(thirdUpdateLog)
			await queryRunner.commitTransaction();
		} catch (e) {
			await queryRunner.rollbackTransaction();
			throw new InternalServerErrorException(e.message)
		} finally {
			await queryRunner.release()
		}
	}
}