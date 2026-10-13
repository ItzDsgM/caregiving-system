import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Data transfer object for assigning or changing a user's system role.
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Target system role to assign to the user account',
    enum: UserRole,
    example: UserRole.CAREGIVER,
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, {
    message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role: UserRole;
}
