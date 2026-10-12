import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto } from './dtos/update-application-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Applications')
@ApiBearerAuth('access-token')
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Patch(':id/status')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Update candidate application status to ACCEPTED or REJECTED' })
  @ApiResponse({ status: 200, description: 'Application status updated, contact unlocked on ACCEPTED' })
  @ApiResponse({ status: 403, description: 'Forbidden if not the job offer owner' })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(user.id, id, dto.status);
  }

  @Get('my-applications')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'List caregiver personal application history' })
  @ApiResponse({ status: 200, description: 'Caregiver submitted applications list' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-caregiver roles' })
  async getMyApplications(@CurrentUser() user: User) {
    return this.applicationsService.getMyApplications(user.id);
  }
}
