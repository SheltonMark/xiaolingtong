import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('work_starts')
@Unique(['jobId', 'date'])
export class WorkStart {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'bigint' })
  confirmedBy: number;

  @Column({ type: 'datetime' })
  confirmedAt: Date;

  @Column({ type: 'json', nullable: true })
  photoUrls: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'confirmedBy' })
  confirmer: User;
}
