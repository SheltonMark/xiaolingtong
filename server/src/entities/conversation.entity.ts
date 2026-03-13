import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('conversations')
@Unique(['userA', 'userB', 'postId'])
export class Conversation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userA: number;

  @Column({ type: 'bigint' })
  userB: number;

  @Column({ type: 'bigint', default: 0 })
  postId: number;

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
