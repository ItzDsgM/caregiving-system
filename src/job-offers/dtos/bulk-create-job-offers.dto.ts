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
  })
  @IsArray({ message: 'offers must be an array' })
  @ArrayNotEmpty({ message: 'offers array must not be empty' })
  @ArrayMaxSize(20, { message: 'Cannot create more than 20 job offers at once' })
  @ValidateNested({ each: true })
  @Type(() => CreateJobOfferDto)
  offers: CreateJobOfferDto[];
}
