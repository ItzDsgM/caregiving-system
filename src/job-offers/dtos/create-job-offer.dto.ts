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
} from 'class-validator';
import { Type } from 'class-transformer';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from '../../caregivers/dtos/availability-slot.dto';

export class CreateJobOfferDto {
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  title: string;

  @IsString()
  @MinLength(30, { message: 'Description must be at least 30 characters long' })
  description: string;

  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType: CareSpecialty;

  @IsString()
  @IsNotEmpty({ message: 'locationCity is required' })
  locationCity: string;

  @IsString()
  @IsNotEmpty({ message: 'locationZone is required' })
  locationZone: string;

  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate: string;

  @IsArray({ message: 'requiredSchedule must be an array of schedule slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  requiredSchedule: AvailabilitySlotDto[];

  @IsNumber({}, { message: 'budgetMin must be a number' })
  @IsPositive({ message: 'budgetMin must be a positive number' })
  budgetMin: number;

  @IsNumber({}, { message: 'budgetMax must be a number' })
  @IsPositive({ message: 'budgetMax must be a positive number' })
  budgetMax: number;
}
