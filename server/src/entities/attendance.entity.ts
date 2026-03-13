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

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({ type: 'datetime', nullable: true })
  checkInTime: Date; // 签到时间

  @Column({ type: 'datetime', nullable: true })
  checkOutTime: Date; // 签退时间

  @Column({
    type: 'enum',
    enum: ['pending', 'checked_in', 'checked_out'],
    default: 'pending',
  })
  status: 'pending' | 'checked_in' | 'checked_out'; // 考勤状态

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  workHours: number; // 工作小时数

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
