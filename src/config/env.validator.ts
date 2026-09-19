import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  PORT: number;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL: string;

  @IsString()
  JWT_REFRESH_TTL: string;

  @IsString()
  TOTP_ISSUER: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validated;
}
