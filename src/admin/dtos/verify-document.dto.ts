import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../../common/enums/verification-status.enum';

export class VerifyDocumentDto {
  @ApiProperty({
    description: 'Document verification decision (APPROVED or REJECTED)',
    enum: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
    example: VerificationStatus.APPROVED,
  })
  @IsIn([VerificationStatus.APPROVED, VerificationStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Auditor notes or reason for rejection (required when status is REJECTED, max 500 characters)',
    example: 'Identity document verified successfully against government registries.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'adminNotes cannot exceed 500 characters' })
  adminNotes?: string;
}
