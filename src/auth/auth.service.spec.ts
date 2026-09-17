import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '../common/role.enum';
import { UserService } from '../users/user.service';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let userService: jest.Mocked<UserService>;

  const user = {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hash',
    role: Role.MEMBER,
    totpSecret: null,
    totpEnabled: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            validateCredentials: jest.fn(),
            getById: jest.fn(),
            setTotpSecret: jest.fn(),
            enableTotp: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('15m') },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            save: jest.fn(),
            findByHash: jest.fn(),
            revoke: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
    refreshTokenRepository = moduleRef.get(RefreshTokenRepository);
    userService = moduleRef.get(UserService);

    jwtService.sign.mockReturnValue('signed-token');
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
  });

  describe('refresh', () => {
    it('rejects a token that was already redeemed', async () => {
      jwtService.verify.mockReturnValue({ sub: user.id, email: user.email, role: user.role });
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: user.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(authService.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates: revokes the old token and issues a fresh pair', async () => {
      jwtService.verify.mockReturnValue({ sub: user.id, email: user.email, role: user.role });
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: user.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });
      userService.getById.mockResolvedValue(user);

      const tokens = await authService.refresh('some-token');

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });

    it('rejects a token that fails signature/expiry verification', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(authService.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the matching stored token', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: user.id,
        tokenHash: 'hash',
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
      });

      await authService.logout('some-token');

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('rt-1');
    });

    it('is a no-op when the token is unknown', async () => {
      refreshTokenRepository.findByHash.mockResolvedValue(null);

      await authService.logout('unknown-token');

      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
