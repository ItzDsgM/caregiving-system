import { IsOptional, IsEnum, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class QueryHistoryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter service history by caregiving specialty',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @ApiPropertyOptional({
    description: 'Filter service history by lifecycle status',
    enum: ['SCHEDULED', 'ONGOING', 'COMPLETED', 'ALL'],
    example: 'COMPLETED',
    default: 'ALL',
  })
  @IsOptional()
  @IsIn(['SCHEDULED', 'ONGOING', 'COMPLETED', 'ALL'], {
    message: 'status must be SCHEDULED, ONGOING, COMPLETED, or ALL',
  })
  status?: string = 'ALL';

  @ApiPropertyOptional({
    description: 'Filter history start date from (ISO 8601 string)',
    example: '2026-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter history start date to (ISO 8601 string)',
    example: '2026-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}
