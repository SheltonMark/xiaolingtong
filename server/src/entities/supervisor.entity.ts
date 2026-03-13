import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('supervisors')
export class Supervisor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  supervisorId: number; // 主管的 workerId

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive'; // 主管状态

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  supervisoryFee: number; // 监管服务费

  @Column({ type: 'int', default: 0 })
  managedWorkerCount: number; // 管理的临工数

  @ManyToOne(() => Job, job => job.supervisors)
  job: Job;

  @ManyToOne(() => User)
  supervisor: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
