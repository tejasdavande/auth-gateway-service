import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuditEvent } from '../audit/audit-event.enum';
import { AuditService } from '../audit/audit.service';
import { UserService } from '../users/user.service';
import { PasswordResetMailer } from './password-reset.mailer';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly userService: UserService,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly mailer: PasswordResetMailer,
    private readonly audit: AuditService
  ) {}

  async request(email: string, ip?: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return;
    }

    await this.resetTokens.invalidateOpenForUser(user.id);

    const token = crypto.randomBytes(32).toString('base64url');
    await this.resetTokens.save({
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    await this.mailer.send(user.email, token);
    await this.audit.record(AuditEvent.PASSWORD_RESET_REQUESTED, { userId: user.id, ip });
  }

  async confirm(token: string, newPassword: string, ip?: string): Promise<void> {
    const stored = await this.resetTokens.findByHash(this.hashToken(token));
    if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('invalid or expired reset token');
    }

    const claimed = await this.resetTokens.markUsed(stored.id);
    if (!claimed) {
      throw new BadRequestException('invalid or expired reset token');
    }

    await this.userService.updatePassword(stored.userId, newPassword);
    await this.refreshTokens.revokeAllForUser(stored.userId);
    await this.audit.record(AuditEvent.PASSWORD_RESET_COMPLETED, { userId: stored.userId, ip });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
