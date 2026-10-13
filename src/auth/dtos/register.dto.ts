import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique user email address used for login and notifications',
    example: 'carlos.mendoza@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Account password (min 8 characters, at least 1 uppercase, 1 lowercase, and 1 number)',
    example: 'SecurePass123!',
    minLength: 8,
    type: String,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'Carlos',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Mendoza',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({
    description: 'Contact phone number (international or local format)',
    example: '+573001234567',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @ApiProperty({
    description: 'Target platform role (CAREGIVER or CLIENT). Admin registration is prohibited',
    enum: [UserRole.CAREGIVER, UserRole.CLIENT],
    example: UserRole.CAREGIVER,
  })
  @IsIn([UserRole.CAREGIVER, UserRole.CLIENT], {
    message: 'Role must be either CAREGIVER or CLIENT. Admin role registration is prohibited',
  })
  role: UserRole;
}
