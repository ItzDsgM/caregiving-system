import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../../common/enums/verification-status.enum';

export class BulkVerifyDocumentItemDto {
  @ApiProperty({ description: 'CaregiverDocument UUID to verify' })
  @IsUUID('4', { message: 'id must be a valid UUID v4' })
  id: string;

  @ApiProperty({
    enum: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
    example: VerificationStatus.APPROVED,
  })
  @IsIn([VerificationStatus.APPROVED, VerificationStatus.REJECTED], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Required if document is REJECTED, maximum 500 characters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'adminNotes cannot exceed 500 characters' })
  adminNotes?: string;
}

export class BulkVerifyDocumentsDto {
  @ApiProperty({
    type: [BulkVerifyDocumentItemDto],
    description: 'Array of documents to verify in batch',
  })
  @IsArray({ message: 'items must be an array' })
  @ArrayNotEmpty({ message: 'items array must not be empty' })
  @ArrayMaxSize(50, { message: 'Cannot verify more than 50 documents at once' })
  @ValidateNested({ each: true })
  @Type(() => BulkVerifyDocumentItemDto)
  items: BulkVerifyDocumentItemDto[];
}
