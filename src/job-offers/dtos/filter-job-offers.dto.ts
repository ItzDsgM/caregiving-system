import { IsOptional, IsString, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class FilterJobOffersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxBudget?: number;
}
