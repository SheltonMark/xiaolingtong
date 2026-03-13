import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('bean_orders')
export class BeanOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ length: 64, unique: true })
  outTradeNo: string;

  @Column({ type: 'int' })
  beanAmount: number;

  @Column({ type: 'int' })
  totalFee: number; // 单位：分

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  payStatus: string; // pending, paid, failed

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
