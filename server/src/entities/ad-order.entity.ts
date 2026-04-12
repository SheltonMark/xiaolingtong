import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('ad_orders')
export class AdOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  userId: number;

  /** banner/feed 为历史位；首页四 Tab 为 home_purchase | home_stock | home_process | home_job */
  @Column({ type: 'varchar', length: 32 })
  slot: string;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 512 })
  imageUrl: string;

  @Column({ length: 256, nullable: true })
  link: string;

  @Column({ length: 16, nullable: true, default: 'internal' })
  linkType: string;

  @Column({ type: 'int' })
  durationDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'expired'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  startAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
