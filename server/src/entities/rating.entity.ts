import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';

@Entity('ratings')
@Unique(['workerId', 'jobId'])
export class Rating {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({ type: 'bigint' })
  enterpriseId: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workerId' })
  worker: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'enterpriseId' })
  enterprise: User;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;
}
