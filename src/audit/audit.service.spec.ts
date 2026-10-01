import { Test } from '@nestjs/testing';
import { AuditEvent } from './audit-event.enum';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogs: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: AuditLogRepository, useValue: { save: jest.fn(), findPage: jest.fn() } }],
    }).compile();

    service = moduleRef.get(AuditService);
    auditLogs = moduleRef.get(AuditLogRepository);
  });

  it('stores the event with its context', async () => {
    await service.record(AuditEvent.LOGIN_FAILED, { userId: 'user-1', ip: '10.0.0.1', metadata: { reason: 'password' } });

    expect(auditLogs.save).toHaveBeenCalledWith({
      event: AuditEvent.LOGIN_FAILED,
      userId: 'user-1',
      ip: '10.0.0.1',
      metadata: { reason: 'password' },
    });
  });

  it('defaults missing context fields to null', async () => {
    await service.record(AuditEvent.LOGOUT);

    expect(auditLogs.save).toHaveBeenCalledWith({ event: AuditEvent.LOGOUT, userId: null, ip: null, metadata: null });
  });

  it('does not throw when the write fails', async () => {
    auditLogs.save.mockRejectedValue(new Error('connection lost'));

    await expect(service.record(AuditEvent.LOGIN_SUCCEEDED, { userId: 'user-1' })).resolves.toBeUndefined();
  });

  it('translates page/limit into skip/take and passes the filter through', async () => {
    auditLogs.findPage.mockResolvedValue([[], 0]);

    await service.list({ event: AuditEvent.LOGIN_FAILED }, 3, 20);

    expect(auditLogs.findPage).toHaveBeenCalledWith({ event: AuditEvent.LOGIN_FAILED }, 40, 20);
  });
});
