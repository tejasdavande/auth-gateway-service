import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditEvent } from '../src/audit/audit-event.enum';
import { UserService } from '../src/users/user.service';

describe('Audit logs endpoint (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  let memberId: string;
  const password = 'Password123!';
  const adminEmail = `audit-admin-${Date.now()}@example.com`;
  const memberEmail = `audit-member-${Date.now()}@example.com`;

  const login = async (email: string) => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await app.get(UserService).ensureAdmin(adminEmail, password);
    const { body } = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: memberEmail, password })
      .expect(201);
    memberId = body.id;

    adminToken = await login(adminEmail);
    memberToken = await login(memberEmail);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/audit-logs').expect(401);
  });

  it('forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('filters by user id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/audit-logs?userId=${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ event: AuditEvent.LOGIN_SUCCEEDED, userId: memberId });
  });

  it('filters by event and returns the newest entry first', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberEmail, password: 'wrong-password' })
      .expect(401);

    const res = await request(app.getHttpServer())
      .get(`/audit-logs?event=${AuditEvent.LOGIN_FAILED}&limit=100`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const items: { event: string; createdAt: string; metadata: { email?: string } | null }[] = res.body.items;
    expect(items.every((e) => e.event === AuditEvent.LOGIN_FAILED)).toBe(true);
    expect(items.some((e) => e.metadata?.email === memberEmail)).toBe(true);

    const times = items.map((e) => new Date(e.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('rejects an unknown event or a malformed user id', async () => {
    await request(app.getHttpServer())
      .get('/audit-logs?event=nope')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/audit-logs?userId=not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
