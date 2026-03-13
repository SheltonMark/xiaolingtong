import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';

@Entity('work_logs')
export class WorkLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hours: number;

  @Column({ type: 'int', nullable: true })
  pieces: number;

  @Column({ type: 'json', nullable: true })
  photoUrls: string[];

  @Column({
    type: 'enum',
    enum: ['normal', 'early_leave', 'late', 'injury', 'absent'],
    default: 'normal',
  })
  anomalyType: string;

  @Column({ length: 256, nullable: true })
  anomalyNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workerId' })
  worker: User;
}
