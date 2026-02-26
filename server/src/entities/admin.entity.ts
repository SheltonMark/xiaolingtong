import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 32, unique: true })
  username: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 32, nullable: true })
  nickname: string;

  @Column({ type: 'enum', enum: ['super', 'admin', 'auditor'], default: 'admin' })
  role: string;

  @Column({ type: 'tinyint', default: 1 })
  isActive: number;

  @CreateDateColumn()
  createdAt: Date;
}
