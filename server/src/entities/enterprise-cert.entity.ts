import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('enterprise_certs')
export class EnterpriseCert {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ length: 128 })
  companyName: string;

  @Column({ length: 64 })
  creditCode: string;

  @Column({ length: 512 })
  licenseImage: string;

  @Column({ length: 32, nullable: true })
  legalPerson: string;

  @Column({ length: 32, nullable: true })
  legalIdNo: string;

  @Column({ length: 512, nullable: true })
  legalIdFront: string;

  @Column({ length: 512, nullable: true })
  legalIdBack: string;

  @Column({ length: 32, nullable: true })
  contactName: string;

  @Column({ length: 20, nullable: true })
  contactPhone: string;

  @Column({ length: 64, nullable: true })
  category: string;

  @Column({ length: 64, nullable: true })
  industry: string;

  @Column({ length: 256, nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Column({ length: 256, nullable: true })
  rejectReason: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
