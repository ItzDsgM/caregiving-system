import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterModalityReportDto {
  @ApiPropertyOptional({
    description: 'Filter start date ISO string boundary for job offer aggregations',
    example: '2026-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter end date ISO string boundary for job offer aggregations',
    example: '2026-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific city',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
