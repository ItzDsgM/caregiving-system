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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from './availability-slot.dto';

export class UpdateCaregiverProfileDto {
  @ApiPropertyOptional({
    description: 'Detailed professional biography (min 50, max 1500 chars)',
    example:
      'Certified nurse assistant with extensive background in post-operative care and elderly mobility rehabilitation. Passionate, punctual, and patient.',
    minLength: 50,
    maxLength: 1500,
  })
  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'Bio must be at least 50 characters long' })
  @MaxLength(1500, { message: 'Bio cannot exceed 1500 characters' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Years of professional or empirical caregiving experience (>= 0)',
    example: 6,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Years of experience must be an integer' })
  @Min(0, { message: 'Years of experience cannot be negative' })
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'List of caregiving specialties offered',
    enum: CareSpecialty,
    isArray: true,
    example: [CareSpecialty.ELDERLY_CARE, CareSpecialty.PHYSICAL_DISABILITY],
  })
  @IsOptional()
  @IsArray({ message: 'Specialties must be an array' })
  @IsEnum(CareSpecialty, {
    each: true,
    message: 'Each specialty must be a valid CareSpecialty enum value',
  })
  specialties?: CareSpecialty[];

  @ApiPropertyOptional({
    description: 'Standard hourly billing rate in base currency (COP)',
    example: 25000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Hourly rate must be a number' })
  @IsPositive({ message: 'Hourly rate must be a positive number' })
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Fixed daily billing rate for 8-hour shift',
    example: 120000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Daily rate for 8h must be a number' })
  @IsPositive({ message: 'Daily rate for 8h must be a positive number' })
  dailyRate8h?: number;

  @ApiPropertyOptional({
    description: 'Fixed daily billing rate for 12-hour shift',
    example: 170000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Daily rate for 12h must be a number' })
  @IsPositive({ message: 'Daily rate for 12h must be a positive number' })
  dailyRate12h?: number;

  @ApiPropertyOptional({
    description: 'Fixed rate for overnight care shift',
    example: 190000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Overnight rate must be a number' })
  @IsPositive({ message: 'Overnight rate must be a positive number' })
  overnightRate?: number;

  @ApiPropertyOptional({
    description: 'Primary operating city',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city?: string;

  @ApiPropertyOptional({
    description: 'List of specific covered neighborhoods or sectors',
    example: ['Usaquén', 'Chapinero', 'Suba'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Neighborhoods must be an array of strings' })
  @IsString({ each: true, message: 'Each neighborhood must be a string' })
  neighborhoods?: string[];

  @ApiPropertyOptional({
    description: 'Maximum coverage travel radius in kilometers (>= 1)',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Max coverage radius must be an integer' })
  @Min(1, { message: 'Max coverage radius must be at least 1 kilometer' })
  maxCoverageRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Weekly availability schedule detailing days and shifts',
    type: [AvailabilitySlotDto],
    example: [
      {
        day: 'MONDAY',
        shifts: ['MORNING', 'AFTERNOON'],
      },
      {
        day: 'WEDNESDAY',
        shifts: ['NIGHT'],
      },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Availability must be an array of availability slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availability?: AvailabilitySlotDto[];
}
