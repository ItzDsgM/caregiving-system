import { IsIn, IsNotEmpty } from 'class-validator';
import { ContactRequestStatus } from '../../common/enums/contact-request-status.enum';

export class RespondContactRequestDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([ContactRequestStatus.ACCEPTED, ContactRequestStatus.REJECTED], {
    message: 'status must be ACCEPTED or REJECTED',
  })
  status: ContactRequestStatus;
}
