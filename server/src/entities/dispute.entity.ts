import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  complainantId: number;

  @Column({ type: 'bigint' })
  respondentId: number;

  @Column({ type: 'varchar', length: 50 })
  type: 'payment' | 'quality' | 'behavior' | 'other';

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  evidence: string[];

  @Column({ type: 'varchar', length: 50, default: 'open' })
  status: 'open' | 'in_progress' | 'resolved' | 'closed';

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution: 'complainant_win' | 'respondent_win' | 'settlement';

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  compensationAmount: number | null;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'complainantId' })
  complainant: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'respondentId' })
  respondent: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
