import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('job_types')
export class JobType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 32, unique: true })
  name: string;

  @Column({ type: 'enum', enum: ['hourly', 'piece'], default: 'hourly' })
  defaultSettlement: string;

  @Column({ type: 'tinyint', default: 1 })
  isActive: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  iconUrl: string;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn()
  createdAt: Date;
}
