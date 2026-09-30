import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditEvent } from '../audit-event.enum';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  event: AuditEvent;

  @Index('IDX_audit_logs_userId')
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index('IDX_audit_logs_createdAt')
  @CreateDateColumn()
  createdAt: Date;
}
