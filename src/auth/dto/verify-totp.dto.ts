import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTotpDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
