import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import { User } from '../users/entities/user.entity';
import { UserService } from '../users/user.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
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

  private issueTokens(user: User): TokenPair {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TTL'),
    });

    return { accessToken, refreshToken };
  }
}
