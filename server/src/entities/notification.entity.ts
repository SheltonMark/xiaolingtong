import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({
    type: 'enum',
    enum: ['job_apply', 'settlement', 'system', 'promotion', 'invite', 'cert'],
  })
  type: string;

  @Column({ length: 128 })
  title: string;

  @Column({ length: 512, nullable: true })
  content: string;

  @Column({ length: 256, nullable: true })
  link: string;

  @Column({ type: 'tinyint', default: 0 })
  isRead: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
