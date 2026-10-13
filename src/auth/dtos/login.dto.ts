import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Registered user email address',
    example: 'carlos.mendoza@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Account password for authentication',
    example: 'SecurePass123!',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
