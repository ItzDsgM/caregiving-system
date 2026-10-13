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
@ApiBearerAuth('access-token')
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
    schema: {
      example: {
        data: [
          {
            serviceId: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Weekend daytime caregiver needed for elderly grandfather',
            careType: 'ELDERLY_CARE',
            status: 'COMPLETED',
            startDate: '2026-10-01T08:00:00.000Z',
            endDate: '2026-10-10T17:00:00.000Z',
            durationDays: 10,
            counterpart: {
              id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
              name: 'Carlos Mendoza',
              role: 'CAREGIVER',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter or date parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['startDateFrom must be a valid ISO 8601 date string'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/my-history',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access token missing or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/my-history',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-client/caregiver roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/my-history',
      },
    },
  })
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
    schema: {
      example: {
        data: [
          {
            serviceId: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Weekend daytime caregiver needed for elderly grandfather',
            careType: 'ELDERLY_CARE',
            status: 'COMPLETED',
            startDate: '2026-10-01T08:00:00.000Z',
            endDate: '2026-10-10T17:00:00.000Z',
            durationDays: 10,
            caregiver: {
              id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
              name: 'Carlos Mendoza',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['limit must not be greater than 50'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/client',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access token missing or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/client',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires CLIENT role',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/client',
      },
    },
  })
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
    schema: {
      example: {
        data: [
          {
            serviceId: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Weekend daytime caregiver needed for elderly grandfather',
            careType: 'ELDERLY_CARE',
            status: 'COMPLETED',
            startDate: '2026-10-01T08:00:00.000Z',
            endDate: '2026-10-10T17:00:00.000Z',
            durationDays: 10,
            client: {
              id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
              name: 'Diana Gomez',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['status must be SCHEDULED, ONGOING, COMPLETED, or ALL'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/caregiver',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access token missing or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/caregiver',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires CAREGIVER role',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/history/caregiver',
      },
    },
  })
  getCaregiverHistory(@CurrentUser() user: User, @Query() dto: QueryHistoryDto) {
    return this.historyService.getCaregiverHistory(user.id, dto);
  }
}
