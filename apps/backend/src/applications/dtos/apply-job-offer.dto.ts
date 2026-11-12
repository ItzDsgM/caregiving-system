import { IsString, MinLength, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobOfferDto {
  @ApiProperty({
    description: 'Detailed motivational cover letter and proposal explanation (min 20 characters)',
    example:
      'Dear client, I have 5 years of specialized experience in elderly care and mobility assistance. I am reliable, CPR certified, and live very close to your location.',
    minLength: 20,
  })
  @IsString()
  @MinLength(20, { message: 'Cover letter must be at least 20 characters long' })
  coverLetter: string;

  @ApiPropertyOptional({
    description: 'Custom proposed rate or monthly compensation (COP)',
    example: 950000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Proposed rate must be a number' })
  @IsPositive({ message: 'Proposed rate must be a positive number' })
  proposedRate?: number;
}
