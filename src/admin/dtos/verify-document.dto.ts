import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '../../common/enums/verification-status.enum';

export class VerifyDocumentDto {
  @IsIn([VerificationStatus.APPROVED, VerificationStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'adminNotes cannot exceed 500 characters' })
  adminNotes?: string;
}
