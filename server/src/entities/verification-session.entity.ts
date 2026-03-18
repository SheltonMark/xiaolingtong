import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('verification_sessions')
export class VerificationSession {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'enum', enum: ['enterprise_cert', 'worker_cert'] })
  scene: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 128 })
  smsCodeHash: string;

  @Column({ length: 64, nullable: true })
  verificationToken: string | null;

  @Column({ type: 'json', nullable: true })
  ocrPayload: Record<string, any> | null;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
