import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditEvent } from './audit-event.enum';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogFilter {
  userId?: string;
  event?: AuditEvent;
}

@Injectable()
export class AuditLogRepository {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async save(entry: Partial<AuditLog>): Promise<AuditLog> {
    return await this.repo.save(entry);
  }

  async findPage(filter: AuditLogFilter, skip: number, take: number): Promise<[AuditLog[], number]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.event) {
      where.event = filter.event;
    }

    return await this.repo.findAndCount({ where, order: { createdAt: 'DESC' }, skip, take });
  }
}
