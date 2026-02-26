import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ length: 64, unique: true })
  word: string;

  @CreateDateColumn()
  createdAt: Date;
}
