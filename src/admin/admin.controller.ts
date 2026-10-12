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
import { AdminService } from './admin.service';
import { VerifyDocumentDto } from './dtos/verify-document.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(ClassSerializerInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('documents/pending')
  @ApiOperation({ summary: 'List all caregiver verification documents with PENDING status' })
  @ApiResponse({ status: 200, description: 'List of pending documents with candidate details' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-admin roles' })
  async getPendingDocuments() {
    return this.adminService.getPendingDocuments();
  }

  @Patch('documents/:id/verify')
  @ApiOperation({ summary: 'Resolve verification status (APPROVED or REJECTED) for a document' })
  @ApiResponse({ status: 200, description: 'Document status resolved, trust badge granted if eligible' })
  @ApiResponse({ status: 400, description: 'adminNotes missing on rejection' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-admin roles' })
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.adminService.verifyDocument(id, dto);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user active status with cascading suspension effects' })
  @ApiResponse({ status: 200, description: 'User status updated and cascading ripple effects applied' })
  @ApiResponse({ status: 400, description: 'suspensionReason missing on deactivation' })
  @ApiResponse({ status: 403, description: 'Forbidden to suspend administrator accounts' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto);
  }
}
