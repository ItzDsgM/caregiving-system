import { IsEnum, IsNotEmpty } from 'class-validator';
import { DocumentType } from '../../common/enums/document-type.enum';

export class UploadDocumentDto {
  @IsNotEmpty({ message: 'documentType is required' })
  @IsEnum(DocumentType, {
    message: 'documentType must be ID_CARD, CRIMINAL_RECORD, HEALTH_CERTIFICATE, or ACADEMIC_DEGREE',
  })
  documentType: DocumentType;
}
