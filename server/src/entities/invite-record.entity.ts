import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('invite_records')
@Unique(['inviteeId'])
export class InviteRecord {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  inviterId: number;

  @Column({ type: 'bigint' })
  inviteeId: number;

  @Column({ length: 8 })
  inviteCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'inviterId' })
  inviter: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'inviteeId' })
  invitee: User;
}
