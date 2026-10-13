import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class SearchCaregiversDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter caregivers by specialty',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'specialty must be a valid CareSpecialty enum value',
  })
  specialty?: CareSpecialty;

  @ApiPropertyOptional({
    description: 'Filter caregivers by operating city (case-insensitive partial match)',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Minimum hourly rate filter',
    example: 20000,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum hourly rate filter',
    example: 50000,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum average rating filter (0 to 5)',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Filter only verified caregivers with approved documents',
    example: true,
  })
  @IsOptional()
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    obj.onlyVerified === 'true' || obj.onlyVerified === true,
  )
  @IsBoolean()
  onlyVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Sort criteria for matching profiles',
    enum: ['price_asc', 'price_desc', 'rating_desc', 'experience_desc'],
    example: 'rating_desc',
  })
  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'rating_desc', 'experience_desc'], {
    message:
      'sortBy must be one of: price_asc, price_desc, rating_desc, experience_desc',
  })
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'experience_desc';
}
