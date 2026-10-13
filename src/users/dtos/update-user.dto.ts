import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Updated first name of the user',
    example: 'Carlos Alberto',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Updated last name of the user',
    example: 'Mendoza Restrepo',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Updated phone number',
    example: '+573009876543',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
