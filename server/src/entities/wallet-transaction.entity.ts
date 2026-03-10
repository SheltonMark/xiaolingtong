import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'enum', enum: ['income', 'withdraw', 'refund', 'commission'] })
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 32, nullable: true })
  refType: string;

  @Column({ type: 'bigint', nullable: true })
  refId: number;

  @Column({ type: 'enum', enum: ['pending', 'success', 'failed'], default: 'pending' })
  status: string;

  @Column({ length: 128, nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
