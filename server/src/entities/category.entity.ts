import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 32 })
  name: string;

  @Column({ type: 'int', default: 0 })
  parentId: number;

  @Column({ type: 'tinyint', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @Column({ type: 'tinyint', default: 1 })
  isActive: number;

  @CreateDateColumn()
  createdAt: Date;
}
