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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminSeedService } from './admin-seed.service';
import { VerifyDocumentDto } from './dtos/verify-document.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
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
  constructor(
    private readonly adminService: AdminService,
    private readonly adminSeedService: AdminSeedService,
  ) {}

  /**
   * Lists all caregiver documents awaiting administrative verification.
   * Restricted strictly to users with the ADMIN role.
   *
   * @returns Array of pending documents with applicant caregiver information.
   */
  @Get('documents/pending')
  @ApiOperation({ summary: 'List all caregiver verification documents with PENDING status' })
  @ApiResponse({
    status: 200,
    description: 'List of pending documents with candidate details',
    schema: {
      example: [
        {
          id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
          caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
          documentType: 'ID_CARD',
          fileUrl: 'uploads/documents/id_sample.pdf',
          verificationStatus: 'PENDING',
          adminNotes: null,
          uploadedAt: '2026-10-12T20:00:00.000Z',
          caregiver: {
            user: {
              firstName: 'Carlos',
              lastName: 'Mendoza',
              email: 'carlos.mendoza@example.com',
            },
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
        path: '/api/v1/admin/documents/pending',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-admin roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/pending',
      },
    },
  })
  async getPendingDocuments() {
    return this.adminService.getPendingDocuments();
  }

  /**
   * Audits a caregiver document and sets its status to APPROVED or REJECTED.
   * If rejected, requires administrative notes.
   * Awards the verified trust badge if both ID card and criminal record are approved.
   *
   * @param id - UUID of the target CaregiverDocument.
   * @param dto - Verification status and audit notes.
   * @returns Updated CaregiverDocument entity.
   */
  @Patch('documents/:id/verify')
  @ApiOperation({ summary: 'Resolve verification status (APPROVED or REJECTED) for a document' })
  @ApiParam({
    name: 'id',
    description: 'CaregiverDocument UUID to audit',
    example: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  })
  @ApiResponse({
    status: 200,
    description: 'Document status resolved, trust badge granted if eligible',
    schema: {
      example: {
        id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
        verificationStatus: 'APPROVED',
        adminNotes: 'National ID verified successfully against government registry.',
        updatedAt: '2026-10-12T20:25:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'adminNotes missing on rejection',
    schema: {
      example: {
        statusCode: 400,
        message: 'adminNotes is required when rejecting a document',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f/verify',
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
        path: '/api/v1/admin/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f/verify',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-admin roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f/verify',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Document not found with id: c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f/verify',
      },
    },
  })
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.adminService.verifyDocument(id, dto);
  }

  /**
   * Verifies multiple caregiver documents in a single batch operation.
   *
   * @param dto - Batch payload containing document verification items.
   * @returns Total count and array of verified documents.
   */
  @Patch('documents/bulk-verify')
  @ApiOperation({ summary: 'Verify multiple documents in a single batch (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Documents verified and trust badges updated',
    schema: {
      example: {
        count: 1,
        documents: [
          {
            id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
            verificationStatus: 'APPROVED',
            adminNotes: 'Government ID card verified.',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing adminNotes for rejected documents or invalid batch',
    schema: {
      example: {
        statusCode: 400,
        message: 'adminNotes is required for all rejected documents',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/bulk-verify',
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
        path: '/api/v1/admin/documents/bulk-verify',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-admin roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/bulk-verify',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'One or more documents not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'One or more documents not found in batch',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/documents/bulk-verify',
      },
    },
  })
  async bulkVerifyDocuments(@Body() dto: BulkVerifyDocumentsDto) {
    return this.adminService.bulkVerifyDocuments(dto);
  }

  /**
   * Provisions multiple users in an administrative batch.
   * Allows creation of CAREGIVER, CLIENT, or ADMIN accounts.
   *
   * @param dto - Batch payload containing an array of user objects.
   * @returns Count and array of sanitized user entities.
   */
  @Post('users/bulk')
  @ApiOperation({ summary: 'Provision multiple users in bulk (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Batch of users successfully created',
    schema: {
      example: {
        count: 1,
        users: [
          {
            id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
            email: 'carlos.admin.provisioned@example.com',
            firstName: 'Carlos',
            lastName: 'Perez',
            role: 'CAREGIVER',
            isActive: true,
            createdAt: '2026-10-12T20:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch input or duplicate emails',
    schema: {
      example: {
        statusCode: 400,
        message: 'Duplicate emails found within provisioning batch',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/bulk',
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
        path: '/api/v1/admin/users/bulk',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-admin roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/bulk',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'One or more emails already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'One or more emails are already registered',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/bulk',
      },
    },
  })
  async bulkCreateUsers(@Body() dto: BulkCreateUsersDto) {
    return this.adminService.bulkCreateUsers(dto);
  }

  /**
   * Modifies account activation status (active or suspended) and triggers cascade ripple effects.
   * Prohibits suspension of administrators.
   *
   * @param id - UUID of the target user.
   * @param dto - Status payload with activation flag and mandatory suspension reason.
   * @returns Updated User entity.
   */
  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user active status with cascading suspension effects' })
  @ApiParam({
    name: 'id',
    description: 'Target User UUID',
    example: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated and cascading ripple effects applied',
    schema: {
      example: {
        id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        email: 'carlos.mendoza@example.com',
        isActive: false,
        suspensionReason:
          'Account temporarily suspended due to repeated breach of user community guidelines.',
        updatedAt: '2026-10-12T20:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'suspensionReason missing on deactivation',
    schema: {
      example: {
        statusCode: 400,
        message: 'suspensionReason is required when suspending an account',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/status',
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
        path: '/api/v1/admin/users/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/status',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden to suspend administrator accounts',
    schema: {
      example: {
        statusCode: 403,
        message: 'Administrator accounts cannot be suspended',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/status',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'User not found with id: 3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/admin/users/3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b/status',
      },
    },
  })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto);
  }

  /**
   * Assigns or updates a user's system role (administrative authorization mechanism).
   * Restricted strictly to administrators.
   *
   * @param id - UUID string of the target user.
   * @param dto - Desired role to assign.
   * @returns Updated user entity.
   */
  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Assign or update a user role (administrative authorization mechanism)' })
  @ApiParam({ name: 'id', description: 'User UUID identifier' })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot demote the last remaining administrator',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto);
  }

  /**
   * Seeds the database with a complete set of initial test records.
   * Creates Administrator, Caregivers, Clients, Job Offers, Applications, Contact Requests, and Reviews.
   *
   * @returns Detailed summary of seeded entities and counts.
   */
  @Post('seed')
  @ApiOperation({ summary: 'Populate database with complete initial test records (Admin, Caregivers, Clients, Offers, Applications, Reviews)' })
  @ApiResponse({
    status: 201,
    description: 'Initial dataset seeded successfully',
    schema: {
      example: {
        message: 'Initial dataset seeded successfully',
        counts: {
          users: 5,
          caregivers: 2,
          clients: 2,
          jobOffers: 2,
          applications: 2,
          contactRequests: 2,
          reviews: 1,
        },
      },
    },
  })
  async seed() {
    return this.adminSeedService.seedDatabase();
  }
}
