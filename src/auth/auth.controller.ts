import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() payload: RegisterDto) {
    return await this.authService.register(payload.email, payload.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() payload: LoginDto) {
    return await this.authService.login(payload.email, payload.password, payload.totpToken);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Body() payload: RefreshTokenDto) {
    return await this.authService.refresh(payload.refreshToken);
  }

  @Post('logout')
  async logout(@Body() payload: RefreshTokenDto) {
    await this.authService.logout(payload.refreshToken);
    return { loggedOut: true };
  }

  @Post('2fa/enroll')
  @UseGuards(JwtAuthGuard)
  async enrollTotp(@CurrentUser() user: AuthenticatedUser) {
    const otpAuthUrl = await this.authService.generateTotpSecret(user.userId, user.email);
    return { otpAuthUrl };
  }

  @Post('2fa/confirm')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  async confirmTotp(@CurrentUser() user: AuthenticatedUser, @Body() payload: VerifyTotpDto) {
    await this.authService.confirmTotpEnrollment(user.userId, payload.token);
    return { totpEnabled: true };
  }
}
