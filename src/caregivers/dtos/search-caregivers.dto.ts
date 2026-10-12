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
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class SearchCaregiversDto extends PaginationDto {
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'specialty must be a valid CareSpecialty enum value',
  })
  specialty?: CareSpecialty;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minRating?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyVerified?: boolean;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'rating_desc', 'experience_desc'], {
    message:
      'sortBy must be one of: price_asc, price_desc, rating_desc, experience_desc',
  })
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'experience_desc';
}
