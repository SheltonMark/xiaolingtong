import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Supervisor } from './supervisor.entity';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  salary: number;

  @Column({ length: 16 })
  salaryUnit: string;

  @Column({ type: 'enum', enum: ['hourly', 'piece'] })
  salaryType: string;

  @Column({ type: 'int' })
  needCount: number;

  @Column({ length: 128 })
  location: string;

  @Column({ length: 64, nullable: true })
  contactName: string;

  @Column({ length: 32, nullable: true })
  contactPhone: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number;

  @Column({ type: 'date' })
  dateStart: string;

  @Column({ type: 'date' })
  dateEnd: string;

  @Column({ length: 64, nullable: true })
  workHours: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  benefits: any[];

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'tinyint', default: 0 })
  urgent: number;

  @Column({ type: 'datetime', nullable: true })
  urgentExpireAt: Date;

  @Column({
    type: 'enum',
    enum: [
      'recruiting',
      'full',
      'working',
      'pending_settlement',
      'settled',
      'closed',
    ],
    default: 'recruiting',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Supervisor, supervisor => supervisor.job)
  supervisors: Supervisor[];
}
