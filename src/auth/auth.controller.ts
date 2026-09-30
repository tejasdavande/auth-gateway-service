import { Body, Controller, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { VerifyTotpDto } from './dto/verify-totp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService
  ) {}

  @Post('register')
  async register(@Body() payload: RegisterDto): Promise<UserResponseDto> {
    const user = await this.authService.register(payload.email, payload.password);
    return UserResponseDto.fromEntity(user);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() payload: LoginDto, @Ip() ip: string) {
    return await this.authService.login(payload.email, payload.password, payload.totpToken, ip);
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

  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestPasswordReset(@Body() payload: RequestPasswordResetDto, @Ip() ip: string) {
    await this.passwordResetService.request(payload.email, ip);
    return { requested: true };
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmPasswordReset(@Body() payload: ConfirmPasswordResetDto, @Ip() ip: string) {
    await this.passwordResetService.confirm(payload.token, payload.newPassword, ip);
    return { passwordReset: true };
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
