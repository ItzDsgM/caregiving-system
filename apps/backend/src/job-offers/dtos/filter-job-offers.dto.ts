import { IsOptional, IsString, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class FilterJobOffersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter job offers by location city (case-insensitive partial match)',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter job offers by required caregiving specialty',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @ApiPropertyOptional({
    description: 'Minimum budget filter (COP)',
    example: 600000,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minBudget?: number;

  @ApiPropertyOptional({
    description: 'Maximum budget filter (COP)',
    example: 1500000,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxBudget?: number;
}
