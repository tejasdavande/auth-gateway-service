import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  tokenHash: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
