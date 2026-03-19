import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Settlement } from './settlement.entity';

@Entity('settlement_items')
export class SettlementItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  settlementId: number;

  @Column({ type: 'bigint' })
  workerId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hours: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  factoryPay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  workerPay: number;

  @Column({ type: 'tinyint', default: 0 })
  confirmed: number;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Settlement)
  @JoinColumn({ name: 'settlementId' })
  settlement: Settlement;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'workerId' })
  worker: User;
}
