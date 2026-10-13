import { IsUUID, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactRequestDto {
  @ApiProperty({
    description: 'Target caregiver unique identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    format: 'uuid',
  })
  @IsUUID('all', { message: 'caregiverId must be a valid UUID' })
  caregiverId: string;

  @ApiProperty({
    description: 'Initial introduction and care requirements inquiry message (min 15 characters)',
    example: 'Hello Carlos, we are looking for care support for my mother during weekday afternoons. Are you available for a phone interview?',
    minLength: 15,
  })
  @IsString()
  @MinLength(15, { message: 'Initial message must be at least 15 characters long' })
  initialMessage: string;
}
