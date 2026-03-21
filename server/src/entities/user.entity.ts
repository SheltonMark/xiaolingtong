import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ length: 64, unique: true })
  openid: string;

  @Column({ length: 64, nullable: true })
  unionId: string;

  @Column({ type: 'enum', enum: ['enterprise', 'worker'], nullable: true })
  role: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 20, nullable: true })
  verifiedPhone: string;

  @Column({ length: 64, nullable: true })
  nickname: string;

  @Column({ length: 64, nullable: true })
  name: string;

  @Column({ length: 512, nullable: true })
  avatarUrl: string;

  @Column({ type: 'tinyint', default: 0 })
  isMember: number;

  @Column({ type: 'datetime', nullable: true })
  memberExpireAt: Date;

  @Column({ type: 'int', default: 0 })
  beanBalance: number;

  @Column({ type: 'int', default: 100 })
  creditScore: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  @Column({ type: 'int', default: 0 })
  completedJobs: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  averageRating: number;

  @Column({ type: 'enum', enum: ['active', 'banned'], default: 'active' })
  status: string;

  @Column({ length: 8, unique: true, nullable: true })
  inviteCode: string;

  @Column({ type: 'bigint', nullable: true })
  invitedBy: number;

  @Column({ type: 'datetime', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
