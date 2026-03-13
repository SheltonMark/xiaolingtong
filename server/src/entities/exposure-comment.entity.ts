import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Exposure } from './exposure.entity';

@Entity('exposure_comments')
export class ExposureComment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  exposureId: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Exposure)
  @JoinColumn({ name: 'exposureId' })
  exposure: Exposure;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
