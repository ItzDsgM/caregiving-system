import {
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from '../../caregivers/dtos/availability-slot.dto';

export class UpdateJobOfferDto {
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(30, { message: 'Description must be at least 30 characters long' })
  description?: string;

  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'locationCity cannot be empty' })
  locationCity?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'locationZone cannot be empty' })
  locationZone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;

  @IsOptional()
  @IsArray({ message: 'requiredSchedule must be an array of schedule slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  requiredSchedule?: AvailabilitySlotDto[];

  @IsOptional()
  @IsNumber({}, { message: 'budgetMin must be a number' })
  @IsPositive({ message: 'budgetMin must be a positive number' })
  budgetMin?: number;

  @IsOptional()
  @IsNumber({}, { message: 'budgetMax must be a number' })
  @IsPositive({ message: 'budgetMax must be a positive number' })
  budgetMax?: number;
}
