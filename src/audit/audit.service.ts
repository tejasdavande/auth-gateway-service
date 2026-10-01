import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent } from './audit-event.enum';
import { AuditLogFilter, AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditContext {
  userId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogs: AuditLogRepository) {}

  // a failed audit write shouldn't take down a login, so errors are logged and swallowed
  async record(event: AuditEvent, context: AuditContext = {}): Promise<void> {
    try {
      await this.auditLogs.save({
        event,
        userId: context.userId ?? null,
        ip: context.ip ?? null,
        metadata: context.metadata ?? null,
      });
    } catch (err) {
      this.logger.error(`failed to write audit event ${event}`, err instanceof Error ? err.stack : err);
    }
  }

  async list(filter: AuditLogFilter, page: number, limit: number): Promise<[AuditLog[], number]> {
    return await this.auditLogs.findPage(filter, (page - 1) * limit, limit);
  }
}
