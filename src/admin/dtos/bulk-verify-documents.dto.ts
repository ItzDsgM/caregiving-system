import {
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateNested,
  IsUUID,
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '../../common/enums/verification-status.enum';

export class BulkVerifyDocumentItemDto {
  @ApiProperty({ description: 'CaregiverDocument UUID to verify', example: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b' })
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
    example: 'Valid criminal background record verified with zero negative records.',
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
    example: [
      {
        id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        status: 'APPROVED',
        adminNotes: 'Government ID card verified.',
      },
      {
        id: '4a1b2c3d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
        status: 'APPROVED',
        adminNotes: 'Criminal record verified.',
      },
    ],
  })
  @IsArray({ message: 'items must be an array' })
  @ArrayNotEmpty({ message: 'items array must not be empty' })
  @ArrayMaxSize(50, { message: 'Cannot verify more than 50 documents at once' })
  @ValidateNested({ each: true })
  @Type(() => BulkVerifyDocumentItemDto)
  items: BulkVerifyDocumentItemDto[];
}
