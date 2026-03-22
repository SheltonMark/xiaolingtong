import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AttendanceSheet } from './attendance-sheet.entity';
import { User } from './user.entity';

@Entity('attendance_sheet_items')
export class AttendanceSheetItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  sheetId: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({ type: 'varchar', length: 64 })
  workerName: string;

  @Column({ type: 'enum', enum: ['normal', 'early_leave', 'late', 'injury', 'absent', 'fraud'], default: 'normal' })
  attendance: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  checkInTime: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  checkOutTime: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hours: number;

  @Column({ type: 'int', default: 0 })
  pieces: number;

  @Column({ type: 'varchar', length: 256, nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => AttendanceSheet)
  @JoinColumn({ name: 'sheetId' })
  sheet: AttendanceSheet;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workerId' })
  worker: User;
}
