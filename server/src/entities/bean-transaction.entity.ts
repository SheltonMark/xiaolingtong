import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('bean_transactions')
export class BeanTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'enum', enum: ['recharge', 'unlock_contact', 'promote', 'reward', 'membership'] })
  type: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ length: 32, nullable: true })
  refType: string;

  @Column({ type: 'bigint', nullable: true })
  refId: number;

  @Column({ length: 128, nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
