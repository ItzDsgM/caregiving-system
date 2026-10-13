import { IsOptional, IsEnum, IsIn, IsDateString } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';

export class QueryHistoryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(CareSpecialty, {
    message: 'careType must be a valid CareSpecialty enum value',
  })
  careType?: CareSpecialty;

  @IsOptional()
  @IsIn(['SCHEDULED', 'ONGOING', 'COMPLETED', 'ALL'], {
    message: 'status must be SCHEDULED, ONGOING, COMPLETED, or ALL',
  })
  status?: string = 'ALL';

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @IsOptional()
  @IsDateString()
  startDateTo?: string;
}
