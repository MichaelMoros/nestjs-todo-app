import { IsNotEmpty, MinLength } from "class-validator";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RoutineStatus } from "../enums/routine-status.enum";
import { User } from "../../user/entities/user.entity"
import { Log } from "src/logs/entities/log.entity";

@Entity()
export class Habit {
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	@MinLength(2)
	@IsNotEmpty()
	routine: string

	@Column()
	start: Date

	@Column()
	end: Date

	@Column()
	lastTouch: Date

	@Column()
	nextTouch: Date

	@Column({ default: 0 })
	streak: number

	@Column({ type: 'enum', enum: RoutineStatus, default: RoutineStatus.InProgress })
	status: RoutineStatus

	@ManyToMany(() => Log, log => log.habits, { cascade: ['remove'] })
	@JoinTable()
	logs: Log[]

	@ManyToOne(() => User, user => user.habits)
	user: User

	@BeforeInsert()
	createTouchPoints() {
		const ONE_DAY = 60 * 60 * 24 * 1000
		const currentTime = new Date();
		const nextUpdateTime = new Date(currentTime.getTime() + ONE_DAY);
		this.lastTouch = currentTime
		this.nextTouch = nextUpdateTime
	}

	@BeforeUpdate()
	generateNextTouchPoints() {
		const ONE_DAY = 60 * 60 * 24 * 1000
		const currentTime = new Date();
		const nextThirtySeconds = new Date(currentTime.getTime() + ONE_DAY)

		this.lastTouch = currentTime
		this.nextTouch = nextThirtySeconds

		// check where if the difference of next touch is more than 1 day
		if (this.lastTouch.getTime() > this.end.getTime()) {
			this.status = RoutineStatus.Completed
		}
	}
}
