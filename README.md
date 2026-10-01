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
  +-- PasswordResetService --- PasswordResetTokenRepository (hashed, single-use) --- Postgres
  |                    +-- PasswordResetMailer (SMTP via nodemailer; logs the token instead when SMTP_HOST is unset)
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
| POST | `/auth/password-reset/request` | none | emails a single-use reset token (30 min TTL); always `202`, so it can't be used to probe which emails exist |
| POST | `/auth/password-reset/confirm` | reset token | sets a new password and revokes every refresh token the user holds |
| POST | `/auth/2fa/enroll` | JWT | returns an otpauth:// URL to scan in an authenticator app |
| POST | `/auth/2fa/confirm` | JWT | confirms the first TOTP code and turns 2FA on |
| GET | `/users?page=&limit=` | JWT, admin | paginated user list (`limit` max 100) |
| GET | `/audit-logs?page=&limit=&userId=&event=` | JWT, admin | paginated audit log, newest first; filter by user id and/or event (e.g. `login.failed`, `role.changed`) |

`RolesGuard` + `@Roles(Role.ADMIN)` gate any route that needs role checks beyond plain authentication.

Every route is rate limited per IP (60 req/min by default). `/auth/login` and `/auth/2fa/confirm` allow 5 per minute, `/auth/refresh` allows 10, `/auth/password-reset/request` allows 3; past that you get a `429`.

On top of the per-IP limit, each account locks for 15 minutes after 5 consecutive failed logins (a wrong password or a wrong TOTP code; a missing TOTP code doesn't count). While locked, even the correct password gets the same `401` as a wrong one, so the response doesn't reveal which accounts exist or are locked. A successful login resets the counter, and a password reset clears the lock.

Security-relevant events are written to an `audit_logs` table: successful and failed logins, lockouts, logouts, password reset requests and completions, TOTP enrollment, and role changes. Each row has the user id (when known), the caller IP where there is one, and optional JSON metadata. A failed login stores the attempted email instead of a user id, since the email may not match any account. A failed audit write is logged and dropped, so it never blocks the request.

## Running locally

```bash
cp .env.example .env
docker compose up
```

The API comes up on `:3000` against a local Postgres container. Without Docker: run Postgres yourself, point `.env` at it, then `npm install && npm run start:dev`.

To create the first admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env` and run `npm run seed`. It's safe to re-run: an existing user with that email is promoted to admin and keeps their password.

## Migrations

`synchronize` is off, so a fresh database has no tables until migrations run:

```bash
npm run migration:run
```

New migrations are hand-authored or generated against the entities with `npm run migration:generate -- src/database/migrations/<name>`. `npm run migration:revert` rolls back the last one.

## Tests

```bash
npm test          # unit tests
npm run migration:run && npm run test:e2e   # e2e, needs a running Postgres
```

## License

MIT
