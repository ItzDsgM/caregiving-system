import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobOfferStatus } from '../../common/enums/job-offer-status.enum';

export class UpdateJobOfferStatusDto {
  @ApiProperty({
    description: 'Target lifecycle status for the job offer (CLOSED or CANCELLED)',
    enum: [JobOfferStatus.CLOSED, JobOfferStatus.CANCELLED],
    example: JobOfferStatus.CLOSED,
  })
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([JobOfferStatus.CLOSED, JobOfferStatus.CANCELLED], {
    message: 'Status can only be updated to CLOSED or CANCELLED',
  })
  status: JobOfferStatus;
}
