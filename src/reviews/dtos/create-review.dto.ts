import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @IsString()
  @MinLength(15, { message: 'Review comment must have at least 15 characters' })
  @MaxLength(500, { message: 'Review comment cannot exceed 500 characters' })
  comment: string;
}
