import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { HistoryService } from './history.service';
import { QueryHistoryDto } from './dtos/query-history.dto';

@ApiTags('History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('my-history')
  @ApiOperation({
    summary:
      'Dynamically retrieve engagement history based on current authenticated role (CLIENT or CAREGIVER)',
  })
  @ApiResponse({
    status: 200,
    description: 'User engagement history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-client/caregiver roles' })
  getMyHistory(@CurrentUser() user: User, @Query() dto: QueryHistoryDto) {
    return this.historyService.getMyHistory(user.id, user.role, dto);
  }

  @Get('client')
  @Roles(UserRole.CLIENT)
  @ApiOperation({
    summary:
      'Retrieve client hiring history with duration and sanitized, non-sensitive caregiver data',
  })
  @ApiResponse({
    status: 200,
    description: 'Client hiring history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires CLIENT role' })
  getClientHistory(@CurrentUser() user: User, @Query() dto: QueryHistoryDto) {
    return this.historyService.getClientHistory(user.id, dto);
  }

  @Get('caregiver')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({
    summary:
      'Retrieve caregiver work history with duration and sanitized, non-sensitive client data',
  })
  @ApiResponse({
    status: 200,
    description: 'Caregiver work history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires CAREGIVER role' })
  getCaregiverHistory(@CurrentUser() user: User, @Query() dto: QueryHistoryDto) {
    return this.historyService.getCaregiverHistory(user.id, dto);
  }
}
