import { IsUUID, IsString, MinLength } from 'class-validator';

export class CreateContactRequestDto {
  @IsUUID('all', { message: 'caregiverId must be a valid UUID' })
  caregiverId: string;

  @IsString()
  @MinLength(15, { message: 'Initial message must be at least 15 characters long' })
  initialMessage: string;
}
