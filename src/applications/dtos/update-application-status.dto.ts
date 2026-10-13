import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../../common/enums/application-status.enum';

export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'Updated application decision status (ACCEPTED or REJECTED)',
    enum: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
    example: ApplicationStatus.ACCEPTED,
  })
  @IsNotEmpty({ message: 'status is required' })
  @IsIn([ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED], {
    message: 'Status can only be ACCEPTED or REJECTED',
  })
  status: ApplicationStatus;
}
