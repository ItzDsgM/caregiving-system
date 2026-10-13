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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiParam({
    name: 'id',
    description: 'Application UUID to update status',
    example: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
  })
  @ApiResponse({
    status: 200,
    description: 'Application status updated, contact unlocked on ACCEPTED',
    schema: {
      example: {
        id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
        jobOfferId: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        coverLetter:
          'Dear client, I have 5 years of specialized experience in elderly care and mobility assistance.',
        proposedRate: 950000,
        status: 'ACCEPTED',
        appliedAt: '2026-10-12T20:10:00.000Z',
        updatedAt: '2026-10-12T20:45:00.000Z',
        unlockedContact: {
          phone: '+573001234567',
          email: 'carlos.mendoza@example.com',
          whatsappUrl: 'https://wa.me/573001234567',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition value',
    schema: {
      example: {
        statusCode: 400,
        message: ['Status can only be ACCEPTED or REJECTED'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/applications/b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e/status',
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
        path: '/api/v1/applications/b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e/status',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if not the job offer owner',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to update applications for this offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/applications/b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e/status',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Application not found with id: b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/applications/b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e/status',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: 'Caregiver submitted applications list',
    schema: {
      example: [
        {
          id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
          coverLetter:
            'Dear client, I have 5 years of specialized experience in elderly care and mobility assistance.',
          proposedRate: 950000,
          status: 'ACCEPTED',
          appliedAt: '2026-10-12T20:10:00.000Z',
          jobOffer: {
            id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Weekend daytime caregiver needed for elderly grandfather',
            careType: 'ELDERLY_CARE',
            locationCity: 'Bogotá',
            status: 'OPEN',
          },
        },
      ],
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
        path: '/api/v1/applications/my-applications',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-caregiver roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/applications/my-applications',
      },
    },
  })
  async getMyApplications(@CurrentUser() user: User) {
    return this.applicationsService.getMyApplications(user.id);
  }
}
