import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('worker_certs')
export class WorkerCert {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ length: 32 })
  realName: string;

  @Column({ length: 32 })
  idNo: string;

  @Column({ length: 64, nullable: true })
  idValidity: string;

  @Column({ length: 512 })
  idFrontImage: string;

  @Column({ length: 512 })
  idBackImage: string;

  @Column({ type: 'json', nullable: true })
  skills: string[];

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: string;

  @Column({ length: 256, nullable: true })
  rejectReason: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
