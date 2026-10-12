import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from './availability-slot.dto';

export class UpdateCaregiverProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'Bio must be at least 50 characters long' })
  @MaxLength(1500, { message: 'Bio cannot exceed 1500 characters' })
  bio?: string;

  @IsOptional()
  @IsInt({ message: 'Years of experience must be an integer' })
  @Min(0, { message: 'Years of experience cannot be negative' })
  yearsOfExperience?: number;

  @IsOptional()
  @IsArray({ message: 'Specialties must be an array' })
  @IsEnum(CareSpecialty, {
    each: true,
    message: 'Each specialty must be a valid CareSpecialty enum value',
  })
  specialties?: CareSpecialty[];

  @IsOptional()
  @IsNumber({}, { message: 'Hourly rate must be a number' })
  @IsPositive({ message: 'Hourly rate must be a positive number' })
  hourlyRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Daily rate for 8h must be a number' })
  @IsPositive({ message: 'Daily rate for 8h must be a positive number' })
  dailyRate8h?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Daily rate for 12h must be a number' })
  @IsPositive({ message: 'Daily rate for 12h must be a positive number' })
  dailyRate12h?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Overnight rate must be a number' })
  @IsPositive({ message: 'Overnight rate must be a positive number' })
  overnightRate?: number;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city?: string;

  @IsOptional()
  @IsArray({ message: 'Neighborhoods must be an array of strings' })
  @IsString({ each: true, message: 'Each neighborhood must be a string' })
  neighborhoods?: string[];

  @IsOptional()
  @IsInt({ message: 'Max coverage radius must be an integer' })
  @Min(1, { message: 'Max coverage radius must be at least 1 kilometer' })
  maxCoverageRadiusKm?: number;

  @IsOptional()
  @IsArray({ message: 'Availability must be an array of availability slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];
}
