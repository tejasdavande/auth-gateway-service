import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user without leaking the password hash', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);

    expect(res.body).toEqual({ id: expect.any(String), email, role: 'member' });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('rejects a second registration with the same email', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(409);
  });

  it('logs in with correct credentials and returns a token pair', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });
});
