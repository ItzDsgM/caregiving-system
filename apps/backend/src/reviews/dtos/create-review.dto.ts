import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Rating score from 1 (lowest) to 5 (highest)',
    example: 5,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @ApiProperty({
    description: 'Detailed written feedback about caregiver service (min 15, max 500 characters)',
    example: 'Outstanding caregiver! Highly attentive, respectful, and punctual. My grandmother was in wonderful hands.',
    minLength: 15,
    maxLength: 500,
  })
  @IsString()
  @MinLength(15, { message: 'Review comment must have at least 15 characters' })
  @MaxLength(500, { message: 'Review comment cannot exceed 500 characters' })
  comment: string;
}
