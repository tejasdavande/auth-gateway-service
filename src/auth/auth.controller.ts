import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../common/current-user.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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
  async login(@Body() payload: LoginDto) {
    return await this.authService.login(payload.email, payload.password, payload.totpToken);
  }

  @Post('2fa/enroll')
  @UseGuards(JwtAuthGuard)
  async enrollTotp(@CurrentUser() user: AuthenticatedUser) {
    const otpAuthUrl = await this.authService.generateTotpSecret(user.userId, user.email);
    return { otpAuthUrl };
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmTotp(@CurrentUser() user: AuthenticatedUser, @Body() payload: VerifyTotpDto) {
    await this.authService.confirmTotpEnrollment(user.userId, payload.token);
    return { totpEnabled: true };
  }
}
