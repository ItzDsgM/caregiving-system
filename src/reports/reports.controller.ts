import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ReportsService } from './reports.service';
import { FilterModalityReportDto } from './dtos/filter-modality-report.dto';
import { FilterZoneReportDto } from './dtos/filter-zone-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('client-modality')
  @ApiOperation({
    summary:
      'Aggregate demand and fulfillment statistics across client modalities (Child, Elderly, Disability)',
  })
  @ApiResponse({
    status: 200,
    description: 'Modality aggregation report calculated successfully',
    schema: {
      example: {
        totalOffers: 45,
        modalityBreakdown: {
          ELDERLY_CARE: 25,
          CHILD_CARE: 12,
          PHYSICAL_DISABILITY: 5,
          COGNITIVE_DISABILITY: 3,
        },
        activeFulfillmentRate: 78.5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter date or city parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['startDate must be a valid ISO 8601 date string'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/reports/client-modality',
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
        path: '/api/v1/reports/client-modality',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/reports/client-modality',
      },
    },
  })
  getClientModalityReport(@Query() dto: FilterModalityReportDto) {
    return this.reportsService.getClientModalityReport(dto);
  }

  @Get('top-zones')
  @ApiOperation({
    summary: 'Rank and retrieve the most served geographical zones and cities',
  })
  @ApiResponse({
    status: 200,
    description: 'Top served zones report calculated successfully',
    schema: {
      example: {
        zones: [
          { zone: 'Chapinero', city: 'Bogotá', count: 18 },
          { zone: 'Usaquén', city: 'Bogotá', count: 14 },
          { zone: 'El Poblado', city: 'Medellín', count: 10 },
        ],
        totalOffersAnalyzed: 42,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid limit or filter parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['limit must not be greater than 50'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/reports/top-zones',
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
        path: '/api/v1/reports/top-zones',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/reports/top-zones',
      },
    },
  })
  getTopZonesReport(@Query() dto: FilterZoneReportDto) {
    return this.reportsService.getTopZonesReport(dto);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Executive dashboard KPI overview',
  })
  @ApiResponse({
    status: 200,
    description: 'Executive dashboard summary retrieved successfully',
    schema: {
      example: {
        totalUsers: 120,
        caregiversCount: 70,
        clientsCount: 48,
        verifiedCaregiversCount: 55,
        totalJobOffers: 45,
        openJobOffers: 20,
        totalApplications: 88,
        totalContactRequests: 34,
        totalReviews: 50,
        platformAverageRating: 4.82,
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
        path: '/api/v1/reports/summary',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/reports/summary',
      },
    },
  })
  getExecutiveSummary() {
    return this.reportsService.getExecutiveSummary();
  }
}
