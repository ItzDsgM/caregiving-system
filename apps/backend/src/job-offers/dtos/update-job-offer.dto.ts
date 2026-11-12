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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { AvailabilitySlotDto } from '../../caregivers/dtos/availability-slot.dto';

export class UpdateJobOfferDto {
  @ApiPropertyOptional({
    description: 'Updated title of the job posting (min 10 characters)',
    example: 'Updated: Full weekend caregiver needed for elderly grandfather',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated detailed job requirements description (min 30 characters)',
    example:
      'Updated schedule requirements: assistance needed on Saturdays and Sundays including light meal prep and mobility exercises.',
    minLength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(30, { message: 'Description must be at least 30 characters long' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated care category',
    enum: CareSpecialty,
    example: CareSpecialty.ELDERLY_CARE,
  })
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @ApiPropertyOptional({
    description: 'Updated city location',
    example: 'Bogotá',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'locationCity cannot be empty' })
  locationCity?: string;

  @ApiPropertyOptional({
    description: 'Updated zone/neighborhood location',
    example: 'Santa Bárbara',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'locationZone cannot be empty' })
  locationZone?: string;

  @ApiPropertyOptional({
    description: 'Updated service start date (ISO 8601 string)',
    example: '2026-11-05T08:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated service end date (ISO 8601 string)',
    example: '2026-12-05T17:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Updated required schedule slots',
    type: [AvailabilitySlotDto],
    example: [
      {
        day: 'SATURDAY',
        shifts: ['FULL_TIME'],
      },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'requiredSchedule must be an array of schedule slots' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  requiredSchedule?: AvailabilitySlotDto[];

  @ApiPropertyOptional({
    description: 'Updated minimum budget (COP)',
    example: 900000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'budgetMin must be a number' })
  @IsPositive({ message: 'budgetMin must be a positive number' })
  budgetMin?: number;

  @ApiPropertyOptional({
    description: 'Updated maximum budget (COP, must be >= budgetMin)',
    example: 1350000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'budgetMax must be a number' })
  @IsPositive({ message: 'budgetMax must be a positive number' })
  budgetMax?: number;
}
