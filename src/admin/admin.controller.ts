import {
  Controller,
  Get,
  Post,
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
import { BulkCreateUsersDto } from './dtos/bulk-create-users.dto';
import { BulkVerifyDocumentsDto } from './dtos/bulk-verify-documents.dto';
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

  @Patch('documents/bulk-verify')
  @ApiOperation({ summary: 'Verify multiple documents in a single batch (Admin only)' })
  @ApiResponse({ status: 200, description: 'Documents verified and trust badges updated' })
  @ApiResponse({ status: 400, description: 'Missing adminNotes for rejected documents' })
  @ApiResponse({ status: 404, description: 'One or more documents not found' })
  async bulkVerifyDocuments(@Body() dto: BulkVerifyDocumentsDto) {
    return this.adminService.bulkVerifyDocuments(dto);
  }

  @Post('users/bulk')
  @ApiOperation({ summary: 'Provision multiple users in bulk (Admin only)' })
  @ApiResponse({ status: 201, description: 'Batch of users successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid batch input or duplicate emails' })
  @ApiResponse({ status: 409, description: 'One or more emails already registered' })
  async bulkCreateUsers(@Body() dto: BulkCreateUsersDto) {
    return this.adminService.bulkCreateUsers(dto);
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
