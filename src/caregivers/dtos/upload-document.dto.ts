import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../../common/enums/document-type.enum';

export class UploadDocumentDto {
  @ApiProperty({
    description:
      'Type of compliance/verification document being uploaded',
    enum: DocumentType,
    example: DocumentType.ID_CARD,
  })
  @IsNotEmpty({ message: 'documentType is required' })
  @IsEnum(DocumentType, {
    message: 'documentType must be ID_CARD, CRIMINAL_RECORD, HEALTH_CERTIFICATE, or ACADEMIC_DEGREE',
  })
  documentType: DocumentType;

  // TODO: Temporary test fallback. Allows sending a test string (e.g. "archivo1.png")
  // instead of a binary multipart file during automated testing and Postman runner execution.
  // In production, replace this with strict physical file validation.
  @ApiPropertyOptional({
    description:
      'Temporary test filename string (e.g. "archivo1.png") accepted for testing and Postman runners',
    example: 'archivo1.png',
  })
  @IsOptional()
  @IsString({ message: 'file must be a string' })
  file?: string;
}
