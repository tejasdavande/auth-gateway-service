import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PasswordResetMailer } from './password-reset.mailer';

jest.mock('nodemailer');

describe('PasswordResetMailer', () => {
  const config = (values: Record<string, unknown>) =>
    ({ get: (key: string) => values[key] }) as ConfigService;

  it('logs the token instead of sending mail when SMTP_HOST is unset', async () => {
    const mailer = new PasswordResetMailer(config({}));
    mailer.onModuleInit();

    await mailer.send('jane@example.com', 'a-token');

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('sends through SMTP when SMTP_HOST is configured', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

    const mailer = new PasswordResetMailer(
      config({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: 587, SMTP_FROM: 'no-reply@example.com' })
    );
    mailer.onModuleInit();

    await mailer.send('jane@example.com', 'a-token');

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587 })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'no-reply@example.com', to: 'jane@example.com' })
    );
  });
});
