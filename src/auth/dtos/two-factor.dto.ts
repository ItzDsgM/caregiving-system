import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data transfer object for supplying a 6-digit TOTP verification code.
 */
export class TwoFactorCodeDto {
  @ApiProperty({
    description: '6-digit time-based one-time password (TOTP) verification code',
    example: '123456',
  })
  @IsNotEmpty({ message: '2FA code is required' })
  @IsString({ message: '2FA code must be a string' })
  @Length(6, 6, { message: '2FA code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: '2FA code must contain only numeric digits' })
  code: string;
}

/**
 * Data transfer object for completing two-factor authentication during login.
 */
export class TwoFactorAuthenticateDto {
  @ApiProperty({
    description: 'User registered email address',
    example: 'carlos.mendoza@example.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address format' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: '6-digit time-based one-time password (TOTP) code from authenticator app',
    example: '654321',
  })
  @IsNotEmpty({ message: '2FA code is required' })
  @IsString({ message: '2FA code must be a string' })
  @Length(6, 6, { message: '2FA code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: '2FA code must contain only numeric digits' })
  code: string;
}
