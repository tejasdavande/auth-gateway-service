import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { UserModule } from '../users/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetMailer } from './password-reset.mailer';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    UserModule,
    AuditModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenRepository,
    PasswordResetTokenRepository,
    PasswordResetService,
    PasswordResetMailer,
  ],
  exports: [AuthService],
})
export class AuthModule {}
