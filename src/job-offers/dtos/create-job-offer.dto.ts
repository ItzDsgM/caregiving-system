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
import { ApiProperty } from '@nestjs/swagger';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from '../../caregivers/dtos/availability-slot.dto';

export class CreateJobOfferDto {
  @ApiProperty({
    description: 'Title of the job posting (min 10 characters)',
    example: 'Weekend daytime caregiver needed for elderly grandfather',
    minLength: 10,
  })
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the caregiving responsibilities and patient profile (min 30 characters)',
    example:
      'Looking for an experienced and attentive caregiver to assist an 82-year-old gentleman with morning mobility exercises, medication reminders, and companionship.',
    minLength: 30,
  })
  @IsString()
  @MinLength(30, { message: 'Description must be at least 30 characters long' })
  description: string;

  @ApiProperty({
    description: 'Required specialty category of care',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType: CareSpecialty;

  @ApiProperty({
    description: 'City where the care service will take place',
    example: 'Bogotá',
  })
  @IsString()
  @IsNotEmpty({ message: 'locationCity is required' })
  locationCity: string;

  @ApiProperty({
    description: 'Zone or neighborhood within the city',
    example: 'Chapinero Alto',
  })
  @IsString()
  @IsNotEmpty({ message: 'locationZone is required' })
  locationZone: string;

  @ApiProperty({
    description: 'Service start date (ISO 8601 string, must be today or future date)',
    example: '2026-11-01T08:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate: string;

  @ApiProperty({
    description: 'Service end date (ISO 8601 string, must be equal to or after startDate)',
    example: '2026-11-30T17:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate: string;

  @ApiProperty({
    description: 'Schedule requirements specifying days and shifts',
    type: [AvailabilitySlotDto],
    example: [
      {
        day: 'SATURDAY',
        shifts: ['MORNING', 'AFTERNOON'],
      },
      {
        day: 'SUNDAY',
        shifts: ['MORNING', 'AFTERNOON'],
      },
    ],
  })
  @IsArray({ message: 'requiredSchedule must be an array of schedule slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  requiredSchedule: AvailabilitySlotDto[];

  @ApiProperty({
    description: 'Minimum compensation budget offered (COP)',
    example: 800000,
    minimum: 1,
  })
  @IsNumber({}, { message: 'budgetMin must be a number' })
  @IsPositive({ message: 'budgetMin must be a positive number' })
  budgetMin: number;

  @ApiProperty({
    description: 'Maximum compensation budget offered (COP, must be >= budgetMin)',
    example: 1200000,
    minimum: 1,
  })
  @IsNumber({}, { message: 'budgetMax must be a number' })
  @IsPositive({ message: 'budgetMax must be a positive number' })
  budgetMax: number;
}
