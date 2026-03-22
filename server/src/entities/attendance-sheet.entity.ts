import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('attendance_sheets')
export class AttendanceSheet {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  jobId: number;

  @Column({ type: 'bigint' })
  enterpriseId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'bigint', nullable: true })
  supervisorId: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  supervisorName: string | null;

  @Column({ type: 'json', nullable: true })
  photoUrls: string[] | null;

  @Column({ type: 'int', default: 0 })
  totalExpected: number;

  @Column({ type: 'int', default: 0 })
  totalPresent: number;

  @Column({ type: 'int', default: 0 })
  totalAbsent: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  totalHours: number;

  @Column({ type: 'int', default: 0 })
  totalPieces: number;

  @Column({
    type: 'enum',
    enum: ['submitted', 'confirmed'],
    default: 'submitted',
  })
  status: 'submitted' | 'confirmed';

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'bigint', nullable: true })
  confirmedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'supervisorId' })
  supervisor: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'confirmedBy' })
  confirmer: User;
}
