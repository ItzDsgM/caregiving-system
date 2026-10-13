import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateJobOfferDto } from './create-job-offer.dto';

export class BulkCreateJobOffersDto {
  @ApiProperty({
    type: [CreateJobOfferDto],
    description: 'Array of job offer creation payloads to publish in bulk',
    example: [
      {
        title: 'Morning assistance for elderly parent in Usaquén',
        description: 'Requires assistance with mobility and breakfast preparation Monday through Friday.',
        careType: 'ELDERLY_CARE',
        locationCity: 'Bogotá',
        locationZone: 'Usaquén',
        startDate: '2026-11-01T07:00:00.000Z',
        endDate: '2026-11-30T13:00:00.000Z',
        requiredSchedule: [{ day: 'MONDAY', shifts: ['MORNING'] }],
        budgetMin: 700000,
        budgetMax: 1000000,
      },
    ],
  })
  @IsArray({ message: 'offers must be an array' })
  @ArrayNotEmpty({ message: 'offers array must not be empty' })
  @ArrayMaxSize(20, { message: 'Cannot create more than 20 job offers at once' })
  @ValidateNested({ each: true })
  @Type(() => CreateJobOfferDto)
  offers: CreateJobOfferDto[];
}
