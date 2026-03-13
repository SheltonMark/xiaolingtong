import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';

@Entity('job_applications')
export class JobApplication {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({
    type: 'enum',
    enum: [
      'pending',
      'accepted',
      'confirmed',
      'working',
      'done',
      'rejected',
      'released',
      'cancelled',
    ],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'tinyint', default: 0 })
  isSupervisor: number;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  rejectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workerId' })
  worker: User;
}
