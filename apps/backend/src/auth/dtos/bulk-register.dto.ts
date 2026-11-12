import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class BulkRegisterDto {
  @ApiProperty({
    type: [RegisterDto],
    description: 'Array of user registration payloads to be created in bulk',
    example: [
      {
        email: 'maria.caregiver@example.com',
        password: 'Password123!',
        firstName: 'Maria',
        lastName: 'Lopez',
        phone: '+573005551001',
        role: 'CAREGIVER',
      },
      {
        email: 'juan.client@example.com',
        password: 'Password123!',
        firstName: 'Juan',
        lastName: 'Rodriguez',
        phone: '+573005551002',
        role: 'CLIENT',
      },
    ],
  })
  @IsArray({ message: 'users must be an array' })
  @ArrayNotEmpty({ message: 'users array must not be empty' })
  @ArrayMaxSize(50, { message: 'Cannot register more than 50 users at once' })
  @ValidateNested({ each: true })
  @Type(() => RegisterDto)
  users: RegisterDto[];
}
