import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
