import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Token use (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const email = `e2e-token-use-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    await request(app.getHttpServer()).post('/auth/register').send({ email, password }).expect(201);
  });

  beforeEach(async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a refresh token on a protected route', async () => {
    await request(app.getHttpServer())
      .post('/auth/2fa/enroll')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });

  it('accepts the access token on the same route', async () => {
    await request(app.getHttpServer())
      .post('/auth/2fa/enroll')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect((res) => expect(res.status).not.toBe(401));
  });

  it('rejects an access token on the refresh endpoint', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: accessToken })
      .expect(401);
  });

  it('still rotates a real refresh token', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken }).expect(201);
  });
});
