import { IsString, MinLength, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class ApplyJobOfferDto {
  @IsString()
  @MinLength(20, { message: 'Cover letter must be at least 20 characters long' })
  coverLetter: string;

  @IsOptional()
  @IsNumber({}, { message: 'Proposed rate must be a number' })
  @IsPositive({ message: 'Proposed rate must be a positive number' })
  proposedRate?: number;
}
