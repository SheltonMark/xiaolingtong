import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notices')
export class Notice {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 128 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: ['popup', 'message'], default: 'message' })
  position: string;

  @Column({ type: 'tinyint', default: 1 })
  isActive: number;

  @Column({ type: 'datetime', nullable: true })
  expireAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
