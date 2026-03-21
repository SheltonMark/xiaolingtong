import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('conversations')
@Index('idx_conversations_userA', ['userA'])
@Unique(['userA', 'userB', 'postId', 'jobId'])
export class Conversation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userA: number;

  @Column({ type: 'bigint' })
  userB: number;

  @Column({ type: 'bigint', default: 0 })
  postId: number;

  @Column({ type: 'bigint', default: 0 })
  jobId: number;

  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userA' })
  userARef: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userB' })
  userBRef: User;
}
