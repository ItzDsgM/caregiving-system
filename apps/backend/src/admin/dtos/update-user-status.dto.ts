import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Active status flag (true = active, false = suspended)',
    example: false,
    type: Boolean,
  })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.isActive)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Mandatory reason when suspending user (required when isActive is false, max 500 characters)',
    example: 'Account temporarily suspended due to repeated breach of user community guidelines.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'suspensionReason cannot exceed 500 characters' })
  suspensionReason?: string;
}
