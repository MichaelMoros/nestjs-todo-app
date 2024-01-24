import { Log } from "src/logs/entities/log.entity";
import { Habit } from "../../habits/entities/habit.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Exclude } from "class-transformer";

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number

	@Column({ unique: true })
	email: string

	@Exclude({ toPlainOnly: true })
	@Column()
	password: string

	@Column({ default: false })
	isVerified: boolean

	@Column({ default: null })
	verifiedAt: Date | null

	@Column({ default: "https://placehold.co/600x400" })
	avatar: string

	@OneToMany(() => Habit, habit => habit.user)
	habits: Habit[];

	@ManyToOne(() => Log, log => log.user)
	logs: Log[];
}
