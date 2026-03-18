import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('contact_profiles')
export class ContactProfile {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ length: 32, nullable: true })
  contactName: string | null;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'tinyint', default: 0 })
  phoneVerified: number;

  @Column({ length: 64, nullable: true })
  wechatId: string | null;

  @Column({ length: 512, nullable: true })
  wechatQrImage: string | null;

  @Column({ type: 'tinyint', default: 1 })
  isDefault: number;

  @Column({ type: 'enum', enum: ['active', 'disabled'], default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
