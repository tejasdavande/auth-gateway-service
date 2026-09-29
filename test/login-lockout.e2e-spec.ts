import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/users/user.service';

describe('Login lockout (e2e)', () => {
  let app: INestApplication;
  let users: UserService;
  const email = `lockout-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    users = app.get(UserService);

    await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('locks the account after five wrong passwords, even for the right one', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' }).expect(401);
    }

    const locked = await users.findByEmail(email);
    expect(locked!.failedLoginAttempts).toBe(0);
    expect(locked!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // the login route's per-ip throttle is also 5/min, so the sixth attempt goes straight to the service
    await expect(app.get(AuthService).login(email, password)).rejects.toThrow(UnauthorizedException);
  });

  it('unlocks on password reset', async () => {
    const user = await users.findByEmail(email);
    await users.updatePassword(user!.id, 'NewPassword456!');

    const unlocked = await users.findByEmail(email);
    expect(unlocked!.lockedUntil).toBeNull();
    await expect(app.get(AuthService).login(email, 'NewPassword456!')).resolves.toHaveProperty('accessToken');
  });
});
