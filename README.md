# auth-gateway-service

Enterprise-style auth and API gateway service built with NestJS — JWT access/refresh tokens, TOTP-based two-factor auth, and role-based access control, the same shape as the auth layer sitting in front of a multi-microservice production platform.

## Why this exists

Most side-project auth demos stop at "login returns a JWT." This one covers the parts that actually show up in production: refresh tokens with separate TTLs that rotate and get revoked on use (stored hashed, never in plaintext), RBAC enforced through a reusable guard/decorator pair, and TOTP 2FA enrollment (so a user can turn it on themselves via an authenticator app, not just have it toggled by an admin).

## Architecture

```
Client
  |
  v
AuthController --- AuthService --- UserService --- UserRepository --- Postgres
  |                    |
  |                    +-- JwtService (access + refresh tokens)
  |                    +-- RefreshTokenRepository (hashed tokens, rotation/revocation) --- Postgres
  |                    +-- otplib (TOTP secret generation / verification)
  |
  v
JwtAuthGuard -> RolesGuard  (applied to protected routes across the app)
```

Controller -> Service -> Repository -> Entity throughout, one repository per entity, no query logic outside the repository layer.

## Tech stack

NestJS, TypeScript, PostgreSQL (TypeORM), Passport-JWT, bcrypt, otplib (TOTP), @nestjs/throttler, Docker.

## Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | create an account |
| POST | `/auth/login` | none | returns access + refresh tokens; requires `totpToken` if 2FA is enabled |
| POST | `/auth/refresh` | refresh token | rotates the refresh token, returns a new access + refresh pair |
| POST | `/auth/logout` | refresh token | revokes the refresh token |
| POST | `/auth/2fa/enroll` | JWT | returns an otpauth:// URL to scan in an authenticator app |
| POST | `/auth/2fa/confirm` | JWT | confirms the first TOTP code and turns 2FA on |

`RolesGuard` + `@Roles(Role.ADMIN)` gate any route that needs role checks beyond plain authentication.

Every route is rate limited per IP (60 req/min by default). `/auth/login` and `/auth/2fa/confirm` allow 5 per minute, `/auth/refresh` allows 10; past that you get a `429`.

## Running locally

```bash
cp .env.example .env
docker compose up
```

The API comes up on `:3000` against a local Postgres container. Without Docker: run Postgres yourself, point `.env` at it, then `npm install && npm run start:dev`.

To create the first admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` and run `npm run seed`. It's safe to re-run: an existing user with that email is promoted to admin and keeps their password.

## Tests

```bash
npm test
```

## License

MIT
