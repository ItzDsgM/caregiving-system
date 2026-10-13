import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactRequestStatus } from '../../common/enums/contact-request-status.enum';

export class RespondContactRequestDto {
  @ApiProperty({
    description: 'Caregiver response status for the contact inquiry (ACCEPTED or REJECTED)',
    enum: [ContactRequestStatus.ACCEPTED, ContactRequestStatus.REJECTED],
    example: ContactRequestStatus.ACCEPTED,
  })
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([ContactRequestStatus.ACCEPTED, ContactRequestStatus.REJECTED], {
    message: 'status must be ACCEPTED or REJECTED',
  })
  status: ContactRequestStatus;
}
