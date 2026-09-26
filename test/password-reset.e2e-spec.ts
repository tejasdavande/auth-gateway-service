import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordResetMailer } from '../src/auth/password-reset.mailer';

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  const sent: { email: string; token: string }[] = [];
  const email = `reset-${Date.now()}@example.com`;
  const oldPassword = 'Password123!';
  const newPassword = 'NewPassword456!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordResetMailer)
      .useValue({ send: async (to: string, token: string) => sent.push({ email: to, token }) })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await request(app.getHttpServer()).post('/auth/register').send({ email, password: oldPassword }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the same way for an unknown email and sends nothing', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .send({ email: 'nobody@example.com' })
      .expect(202);

    expect(res.body).toEqual({ requested: true });
    expect(sent).toHaveLength(0);
  });

  it('resets the password, revokes existing sessions and burns the token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: oldPassword })
      .expect(201);

    await request(app.getHttpServer()).post('/auth/password-reset/request').send({ email }).expect(202);
    expect(sent).toHaveLength(1);
    const { token } = sent[0];

    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token, newPassword })
      .expect(200);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password: oldPassword }).expect(401);
    await request(app.getHttpServer()).post('/auth/login').send({ email, password: newPassword }).expect(201);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token, newPassword: 'AnotherPassword789!' })
      .expect(400);
  });
});
