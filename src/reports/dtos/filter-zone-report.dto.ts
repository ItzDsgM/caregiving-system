import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class FilterZoneReportDto {
  @ApiPropertyOptional({
    description: 'Filter report by specific city',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter report by care specialty',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @ApiPropertyOptional({
    description: 'Filter start date ISO string boundary',
    example: '2026-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter end date ISO string boundary',
    example: '2026-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of top zones to return (1 to 50)',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
