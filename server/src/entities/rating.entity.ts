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
import { User } from './user.entity';
import { Job } from './job.entity';

@Entity('ratings')
@Unique(['workerId', 'jobId'])
export class Rating {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  raterId: number; // 评价者 ID

  @Column({ type: 'bigint' })
  ratedId: number; // 被评价者 ID

  @Column({ type: 'varchar', length: 50 })
  raterRole: 'worker' | 'enterprise'; // 评价者角色

  @Column({ type: 'int', default: 5 })
  score: number; // 评分 1-5

  @Column({ type: 'text', nullable: true })
  comment: string; // 评价内容

  @Column({ type: 'json', nullable: true })
  tags: string[]; // 标签

  @Column({ type: 'boolean', default: false })
  isAnonymous: boolean; // 是否匿名

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected'; // 审核状态

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'raterId' })
  rater: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ratedId' })
  rated: User;

  // Legacy fields for backward compatibility
  @Column({ type: 'bigint', nullable: true })
  workerId?: number;

  @Column({ type: 'bigint', nullable: true })
  enterpriseId?: number;

  @Column({ type: 'text', nullable: true })
  content?: string;
}
