import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class AdminCreateUserItemDto {
  @ApiProperty({ example: 'bulk.caregiver@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({ example: '+573005550001' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CAREGIVER })
  @IsEnum(UserRole, {
    message: 'Role must be a valid UserRole (CAREGIVER, CLIENT, ADMIN)',
  })
  role: UserRole;
}

export class BulkCreateUsersDto {
  @ApiProperty({
    type: [AdminCreateUserItemDto],
    description: 'Array of user creation payloads for admin bulk provisioning',
    example: [
      {
        email: 'carlos.admin.provisioned@example.com',
        password: 'Password123!',
        firstName: 'Carlos',
        lastName: 'Perez',
        phone: '+573005550001',
        role: 'CAREGIVER',
      },
      {
        email: 'diana.admin.provisioned@example.com',
        password: 'Password123!',
        firstName: 'Diana',
        lastName: 'Gomez',
        phone: '+573005550002',
        role: 'CLIENT',
      },
    ],
  })
  @IsArray({ message: 'users must be an array' })
  @ArrayNotEmpty({ message: 'users array must not be empty' })
  @ArrayMaxSize(50, { message: 'Cannot create more than 50 users at once' })
  @ValidateNested({ each: true })
  @Type(() => AdminCreateUserItemDto)
  users: AdminCreateUserItemDto[];
}
