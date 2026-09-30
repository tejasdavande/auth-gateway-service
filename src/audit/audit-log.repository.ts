import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogRepository {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async save(entry: Partial<AuditLog>): Promise<AuditLog> {
    return await this.repo.save(entry);
  }
}
