import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/users/user.service';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let memberToken: string;
  const password = 'Password123!';
  const adminEmail = `e2e-admin-${Date.now()}@example.com`;
  const memberEmail = `e2e-member-${Date.now()}@example.com`;

  const login = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken as string;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await app.get(UserService).ensureAdmin(adminEmail, password);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: memberEmail, password })
      .expect(201);

    adminToken = await login(adminEmail);
    memberToken = await login(memberEmail);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('forbids non-admin users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403);
  });

  it('lets an admin page through users without leaking secrets', async () => {
    const res = await request(app.getHttpServer())
      .get('/users?page=1&limit=100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(100);
    expect(res.body.total).toBeGreaterThanOrEqual(2);

    const emails = res.body.items.map((u: { email: string }) => u.email);
    expect(emails).toEqual(expect.arrayContaining([adminEmail, memberEmail]));
    for (const user of res.body.items) {
      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'role']);
    }
  });

  it('rejects an out-of-range limit', async () => {
    await request(app.getHttpServer())
      .get('/users?limit=500')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
