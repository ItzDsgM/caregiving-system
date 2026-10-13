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
@ApiBearerAuth()
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role' })
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role' })
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
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role' })
  getExecutiveSummary() {
    return this.reportsService.getExecutiveSummary();
  }
}
