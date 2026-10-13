import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FilterModalityReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
