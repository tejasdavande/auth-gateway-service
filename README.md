# auth-gateway-service

Enterprise-style auth and API gateway service built with NestJS — JWT access/refresh tokens, TOTP-based two-factor auth, and role-based access control, the same shape as the auth layer sitting in front of a multi-microservice production platform.

## Why this exists

Most side-project auth demos stop at "login returns a JWT." This one covers the parts that actually show up in production: refresh tokens with separate TTLs, RBAC enforced through a reusable guard/decorator pair, and TOTP 2FA enrollment (so a user can turn it on themselves via an authenticator app, not just have it toggled by an admin).

## Architecture

```
Client
  |
  v
AuthController --- AuthService --- UserService --- UserRepository --- Postgres
  |                    |
  |                    +-- JwtService (access + refresh tokens)
  |                    +-- otplib (TOTP secret generation / verification)
  |
  v
JwtAuthGuard -> RolesGuard  (applied to protected routes across the app)
```

Controller -> Service -> Repository -> Entity throughout, one repository per entity, no query logic outside the repository layer.

## Tech stack

NestJS, TypeScript, PostgreSQL (TypeORM), Passport-JWT, bcrypt, otplib (TOTP), Docker.

## Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | create an account |
| POST | `/auth/login` | none | returns access + refresh tokens; requires `totpToken` if 2FA is enabled |
| POST | `/auth/2fa/enroll` | JWT | returns an otpauth:// URL to scan in an authenticator app |
| POST | `/auth/2fa/confirm` | JWT | confirms the first TOTP code and turns 2FA on |

`RolesGuard` + `@Roles(Role.ADMIN)` gate any route that needs role checks beyond plain authentication.

## Running locally

```bash
cp .env.example .env
docker compose up
```

The API comes up on `:3000` against a local Postgres container. Without Docker: run Postgres yourself, point `.env` at it, then `npm install && npm run start:dev`.

## Tests

```bash
npm test
```

## License

MIT
