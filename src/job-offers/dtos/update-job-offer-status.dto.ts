import { IsIn, IsNotEmpty } from 'class-validator';
import { JobOfferStatus } from '../../common/enums/job-offer-status.enum';

export class UpdateJobOfferStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([JobOfferStatus.CLOSED, JobOfferStatus.CANCELLED], {
    message: 'Status can only be updated to CLOSED or CANCELLED',
  })
  status: JobOfferStatus;
}
