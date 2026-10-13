import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
}
