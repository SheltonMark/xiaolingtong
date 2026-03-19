import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'enum', enum: ['purchase', 'stock', 'process'] })
  type: string;

  @Column({ length: 128, nullable: true })
  title: string;

  @Column({ length: 64, nullable: true })
  industry: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  fields: any[];

  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ length: 32, nullable: true })
  contactName: string;

  @Column({ length: 20, nullable: true })
  contactPhone: string;

  @Column({ length: 64, nullable: true })
  contactWechat: string;

  @Column({ length: 512, nullable: true })
  contactWechatQr: string;

  @Column({ type: 'tinyint', default: 0 })
  showPhone: number;

  @Column({ type: 'tinyint', default: 0 })
  showWechat: number;

  @Column({ type: 'tinyint', default: 0 })
  showWechatQr: number;

  @Column({ length: 128, nullable: true })
  location: string;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  contactUnlockCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'expired', 'deleted'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'datetime', nullable: true })
  expireAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
