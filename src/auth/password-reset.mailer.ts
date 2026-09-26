import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PasswordResetMailer {
  private readonly logger = new Logger(PasswordResetMailer.name);

  async send(email: string, token: string): Promise<void> {
    // TODO: swap for a real transport (SES/SMTP); logging the token is only acceptable locally
    this.logger.debug(`password reset token for ${email}: ${token}`);
  }
}
