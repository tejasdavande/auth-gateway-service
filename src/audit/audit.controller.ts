import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuditService } from './audit.service';
import { AuditLogPageDto } from './dto/audit-log-page.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: ListAuditLogsQueryDto): Promise<AuditLogPageDto> {
    const [items, total] = await this.auditService.list(
      { userId: query.userId, event: query.event },
      query.page,
      query.limit,
    );
    return { items, total, page: query.page, limit: query.limit };
  }
}
