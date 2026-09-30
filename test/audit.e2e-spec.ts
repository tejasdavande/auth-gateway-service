import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuditEvent } from '../src/audit/audit-event.enum';
import { AuditLog } from '../src/audit/entities/audit-log.entity';
import { UserService } from '../src/users/user.service';

describe('Audit log (e2e)', () => {
  let app: INestApplication;
  let auditLogs: Repository<AuditLog>;
  const email = `audit-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    auditLogs = app.get(getRepositoryToken(AuditLog));

    await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records failed and successful logins with the caller ip', async () => {
    const user = await app.get(UserService).findByEmail(email);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
    const { body } = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);
    await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: body.refreshToken }).expect(201);

    const entries = await auditLogs.find({ where: { userId: user!.id }, order: { createdAt: 'ASC' } });
    expect(entries.map((e) => e.event)).toEqual([AuditEvent.LOGIN_SUCCEEDED, AuditEvent.LOGOUT]);
    expect(entries[0].ip).toBeTruthy();

    const failures = await auditLogs.find({ where: { event: AuditEvent.LOGIN_FAILED } });
    expect(failures.some((e) => e.metadata?.email === email && e.ip)).toBe(true);
  });
});
