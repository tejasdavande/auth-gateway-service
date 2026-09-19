import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController rate limiting', () => {
  let app: INestApplication;
  const authService = { login: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 429 on the sixth login within a minute', async () => {
    const body = { email: 'jane@example.com', password: 'Password123!' };

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(body).expect(201);
    }

    await request(app.getHttpServer()).post('/auth/login').send(body).expect(429);
  });
});
