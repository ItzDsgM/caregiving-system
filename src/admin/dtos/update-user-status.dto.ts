import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'suspensionReason cannot exceed 500 characters' })
  suspensionReason?: string;
}
