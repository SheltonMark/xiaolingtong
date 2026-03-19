import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sys_configs')
export class SysConfig {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 64, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ length: 128, nullable: true })
  label: string;

  @Column({ length: 32, default: 'general' })
  group: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
