import { AuditLog } from '../entities/audit-log.entity';

export class AuditLogPageDto {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
