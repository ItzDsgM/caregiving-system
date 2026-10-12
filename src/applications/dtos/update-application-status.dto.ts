import { IsIn, IsNotEmpty } from 'class-validator';
import { ApplicationStatus } from '../../common/enums/application-status.enum';

export class UpdateApplicationStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED], {
    message: 'Status can only be ACCEPTED or REJECTED',
  })
  status: ApplicationStatus;
}
