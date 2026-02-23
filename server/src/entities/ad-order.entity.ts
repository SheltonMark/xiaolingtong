import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('ad_orders')
export class AdOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'enum', enum: ['banner', 'feed'] })
  slot: string;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 512 })
  imageUrl: string;

  @Column({ length: 256, nullable: true })
  link: string;

  @Column({ type: 'int' })
  durationDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'enum', enum: ['pending', 'active', 'expired'], default: 'pending' })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  startAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
