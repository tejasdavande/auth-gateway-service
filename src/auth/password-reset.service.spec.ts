import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as crypto from 'crypto';
import { Role } from '../common/role.enum';
import { UserService } from '../users/user.service';
import { PasswordResetMailer } from './password-reset.mailer';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { PasswordResetService } from './password-reset.service';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let userService: jest.Mocked<UserService>;
  let resetTokens: jest.Mocked<PasswordResetTokenRepository>;
  let refreshTokens: jest.Mocked<RefreshTokenRepository>;
  let mailer: jest.Mocked<PasswordResetMailer>;

  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hash',
    role: Role.MEMBER,
    totpSecret: null,
    totpEnabled: false,
    createdAt: new Date(),
  };

  const storedToken = (overrides: Partial<{ usedAt: Date | null; expiresAt: Date }> = {}) => ({
    id: 'prt-1',
    userId: user.id,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    usedAt: null,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UserService, useValue: { findByEmail: jest.fn(), updatePassword: jest.fn() } },
        {
          provide: PasswordResetTokenRepository,
          useValue: {
            save: jest.fn(),
            findByHash: jest.fn(),
            markUsed: jest.fn(),
            invalidateOpenForUser: jest.fn(),
          },
        },
        { provide: RefreshTokenRepository, useValue: { revokeAllForUser: jest.fn() } },
        { provide: PasswordResetMailer, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PasswordResetService);
    userService = moduleRef.get(UserService);
    resetTokens = moduleRef.get(PasswordResetTokenRepository);
    refreshTokens = moduleRef.get(RefreshTokenRepository);
    mailer = moduleRef.get(PasswordResetMailer);
  });

  describe('request', () => {
    it('does nothing for an unknown email', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await service.request('nobody@example.com');

      expect(resetTokens.save).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('stores only the hash of the token it mails out', async () => {
      userService.findByEmail.mockResolvedValue(user);

      await service.request(user.email);

      const sentToken = mailer.send.mock.calls[0][1];
      const saved = resetTokens.save.mock.calls[0][0];
      expect(resetTokens.invalidateOpenForUser).toHaveBeenCalledWith(user.id);
      expect(saved.tokenHash).toBe(crypto.createHash('sha256').update(sentToken).digest('hex'));
      expect(saved.tokenHash).not.toBe(sentToken);
    });
  });

  describe('confirm', () => {
    it('updates the password and revokes all refresh tokens', async () => {
      resetTokens.findByHash.mockResolvedValue(storedToken());
      resetTokens.markUsed.mockResolvedValue(true);

      await service.confirm('token', 'NewPassword123!');

      expect(userService.updatePassword).toHaveBeenCalledWith(user.id, 'NewPassword123!');
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(user.id);
    });

    it('rejects an unknown token', async () => {
      resetTokens.findByHash.mockResolvedValue(null);

      await expect(service.confirm('token', 'NewPassword123!')).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired token', async () => {
      resetTokens.findByHash.mockResolvedValue(storedToken({ expiresAt: new Date(Date.now() - 1000) }));

      await expect(service.confirm('token', 'NewPassword123!')).rejects.toThrow(BadRequestException);
      expect(userService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects when a concurrent confirm already claimed the token', async () => {
      resetTokens.findByHash.mockResolvedValue(storedToken());
      resetTokens.markUsed.mockResolvedValue(false);

      await expect(service.confirm('token', 'NewPassword123!')).rejects.toThrow(BadRequestException);
      expect(userService.updatePassword).not.toHaveBeenCalled();
    });
  });
});
