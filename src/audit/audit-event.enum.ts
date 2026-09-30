export enum AuditEvent {
  LOGIN_SUCCEEDED = 'login.succeeded',
  LOGIN_FAILED = 'login.failed',
  ACCOUNT_LOCKED = 'account.locked',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUESTED = 'password_reset.requested',
  PASSWORD_RESET_COMPLETED = 'password_reset.completed',
  TOTP_ENABLED = 'totp.enabled',
  ROLE_CHANGED = 'role.changed',
}
