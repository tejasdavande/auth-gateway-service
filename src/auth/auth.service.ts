import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { User } from '../users/entities/user.entity';
import { UserService } from '../users/user.service';
import { RefreshTokenRepository } from './refresh-token.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokens: RefreshTokenRepository
  ) {}

  async register(email: string, password: string): Promise<User> {
    return await this.userService.register(email, password);
  }

  async login(email: string, password: string, totpToken?: string): Promise<TokenPair> {
    const user = await this.userService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    if (user.totpEnabled) {
      if (!totpToken || !authenticator.check(totpToken, user.totpSecret!)) {
        throw new UnauthorizedException('invalid or missing totp token');
      }
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(refreshToken);

    const stored = await this.refreshTokens.findByHash(this.hashToken(refreshToken));
    if (!stored || stored.revokedAt) {
      throw new UnauthorizedException('refresh token revoked or unknown');
    }

    // rotate: the old token is single-use, revoked as soon as it's redeemed
    await this.refreshTokens.revoke(stored.id);

    const user = await this.userService.getById(payload.sub);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokens.findByHash(this.hashToken(refreshToken));
    if (stored) {
      await this.refreshTokens.revoke(stored.id);
    }
  }

  async generateTotpSecret(userId: string, email: string): Promise<string> {
    const secret = authenticator.generateSecret();
    await this.userService.setTotpSecret(userId, secret);

    return authenticator.keyuri(email, this.configService.get<string>('TOTP_ISSUER')!, secret);
  }

  async confirmTotpEnrollment(userId: string, token: string): Promise<void> {
    const user = await this.userService.getById(userId);
    if (!user.totpSecret || !authenticator.check(token, user.totpSecret)) {
      throw new UnauthorizedException('invalid totp token');
    }

    await this.userService.enableTotp(userId);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL'),
    });

    const { exp } = this.jwtService.decode(refreshToken) as { exp: number };
    await this.refreshTokens.save({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(exp * 1000),
    });

    return { accessToken, refreshToken };
  }

  private verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('invalid or expired refresh token');
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
