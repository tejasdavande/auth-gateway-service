import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class PasswordResetMailer implements OnModuleInit {
  private readonly logger = new Logger(PasswordResetMailer.name);
  private transport: nodemailer.Transporter | null = null;
  private from: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST not set, falling back to logging reset tokens instead of emailing them');
      return;
    }

    this.from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@auth-gateway.local';
    this.transport = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: this.config.get<number>('SMTP_PORT') === 465,
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  async send(email: string, token: string): Promise<void> {
    if (!this.transport) {
      this.logger.debug(`password reset token for ${email}: ${token}`);
      return;
    }

    await this.transport.sendMail({
      from: this.from,
      to: email,
      subject: 'Reset your password',
      text: `Use this token to reset your password (expires in 30 minutes): ${token}`,
    });
  }
}
