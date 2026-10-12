import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserStatusDto {
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isActive)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'suspensionReason cannot exceed 500 characters' })
  suspensionReason?: string;
}
