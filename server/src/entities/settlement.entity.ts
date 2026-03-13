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

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  enterpriseId: number;

  @Column({ type: 'int' })
  totalWorkers: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  factoryTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  workerTotal: number;

  @Column({ type: 'bigint', nullable: true })
  supervisorId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  supervisorFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.2 })
  commissionRate: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'distributed', 'completed'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'enterpriseId' })
  enterprise: User;
}
