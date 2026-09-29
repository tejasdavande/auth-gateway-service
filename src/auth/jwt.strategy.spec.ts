import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Role } from '../common/role.enum';
import { UserService } from '../users/user.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
        {
          provide: UserService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
    userService = moduleRef.get(UserService);
  });

  it('returns the user\'s current role from the database, not the token', async () => {
    userService.findById.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
      totpSecret: null,
      totpEnabled: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
    });

    const result = await strategy.validate({ sub: '1', email: 'user@example.com', role: Role.MEMBER });

    expect(result).toEqual({ userId: '1', email: 'user@example.com', role: Role.ADMIN });
  });

  it('rejects a token for a user that no longer exists', async () => {
    userService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'deleted-id', email: 'gone@example.com', role: Role.MEMBER })
    ).rejects.toThrow(UnauthorizedException);
  });
});
