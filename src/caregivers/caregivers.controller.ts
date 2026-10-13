import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CaregiversService } from './caregivers.service';
import { multerOptions } from './document-upload.config';
import { UpdateCaregiverProfileDto } from './dtos/update-caregiver-profile.dto';
import { UploadDocumentDto } from './dtos/upload-document.dto';
import { SearchCaregiversDto } from './dtos/search-caregivers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Caregivers')
@Controller('caregivers')
@UseInterceptors(ClassSerializerInterceptor)
export class CaregiversController {
  constructor(private readonly caregiversService: CaregiversService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and filter active verified caregivers' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of matching caregivers',
    schema: {
      example: {
        data: [
          {
            id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
            bio: 'Certified nurse assistant with 6 years experience in elderly care and rehabilitation.',
            yearsOfExperience: 6,
            specialties: ['ELDERLY_CARE'],
            hourlyRate: 25000,
            dailyRate8h: 120000,
            dailyRate12h: 170000,
            overnightRate: 190000,
            city: 'Bogotá',
            neighborhoods: ['Usaquén', 'Chapinero'],
            maxCoverageRadiusKm: 15,
            ratingAverage: '4.90',
            totalReviews: 12,
            isDocumentVerified: true,
            user: {
              id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
              firstName: 'Carlos',
              lastName: 'Mendoza',
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
    description: 'Invalid search query parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['minPrice must be a positive number'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/search',
      },
    },
  })
  async search(@Query() searchDto: SearchCaregiversDto) {
    return this.caregiversService.search(searchDto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Get current authenticated caregiver full profile' })
  @ApiResponse({
    status: 200,
    description: 'Caregiver profile returned',
    schema: {
      example: {
        id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        bio: 'Certified nurse assistant with 6 years experience in elderly care and rehabilitation.',
        yearsOfExperience: 6,
        specialties: ['ELDERLY_CARE'],
        hourlyRate: 25000,
        dailyRate8h: 120000,
        dailyRate12h: 170000,
        overnightRate: 190000,
        city: 'Bogotá',
        neighborhoods: ['Usaquén', 'Chapinero'],
        maxCoverageRadiusKm: 15,
        availability: [
          {
            day: 'MONDAY',
            shifts: ['MORNING', 'AFTERNOON'],
          },
        ],
        ratingAverage: '4.90',
        totalReviews: 12,
        isDocumentVerified: true,
        documents: [
          {
            id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
            documentType: 'ID_CARD',
            fileUrl: 'uploads/documents/id_sample.pdf',
            verificationStatus: 'APPROVED',
            adminNotes: 'National ID verified successfully.',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access token missing or invalid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/me',
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
        path: '/api/v1/caregivers/me',
      },
    },
  })
  async getMyProfile(@CurrentUser() user: User) {
    return this.caregiversService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Update current caregiver bio, specialties, rates, and schedule' })
  @ApiResponse({
    status: 200,
    description: 'Caregiver profile successfully updated',
    schema: {
      example: {
        id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        bio: 'Updated bio: Certified nurse assistant with 7 years of specialized elderly and mobility care experience.',
        yearsOfExperience: 7,
        specialties: ['ELDERLY_CARE', 'PHYSICAL_DISABILITY'],
        hourlyRate: 28000,
        dailyRate8h: 130000,
        dailyRate12h: 180000,
        overnightRate: 200000,
        city: 'Bogotá',
        neighborhoods: ['Usaquén', 'Suba', 'Chapinero'],
        maxCoverageRadiusKm: 20,
        ratingAverage: '4.90',
        totalReviews: 12,
        isDocumentVerified: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on profile fields',
    schema: {
      example: {
        statusCode: 400,
        message: ['Bio must be at least 50 characters long'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/me',
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
        path: '/api/v1/caregivers/me',
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
        path: '/api/v1/caregivers/me',
      },
    },
  })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateCaregiverProfileDto,
  ) {
    return this.caregiversService.updateMyProfile(user.id, updateDto);
  }

  @Post('me/documents')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload verification document (PDF, JPEG, PNG <= 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Document file (PDF, JPEG, PNG <= 5MB)' },
        documentType: {
          type: 'string',
          enum: ['ID_CARD', 'CRIMINAL_RECORD', 'HEALTH_CERTIFICATE', 'ACADEMIC_DEGREE'],
          example: 'ID_CARD',
          description: 'Category of verification document',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and set to PENDING status',
    schema: {
      example: {
        id: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        documentType: 'ID_CARD',
        fileUrl: 'uploads/documents/document-1728770000.pdf',
        verificationStatus: 'PENDING',
        adminNotes: null,
        uploadedAt: '2026-10-12T20:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type, size exceeded, or missing file',
    schema: {
      example: {
        statusCode: 400,
        message: 'A file is required for document upload',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/me/documents',
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
        path: '/api/v1/caregivers/me/documents',
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
        path: '/api/v1/caregivers/me/documents',
      },
    },
  })
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ) {
    // TODO: Temporary test fallback. If no physical multipart file was provided,
    // allow a filename string (such as "archivo1.png") sent via uploadDto.file.
    // Replace with strict physical file validation once production file storage is finalized.
    if (!file && !uploadDto?.file) {
      throw new BadRequestException('A file is required for document upload');
    }
    return this.caregiversService.uploadDocument(user.id, file, uploadDto);
  }

  @Delete('me/documents/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Delete document attachment (only PENDING or REJECTED)' })
  @ApiParam({
    name: 'id',
    description: 'CaregiverDocument UUID to delete',
    example: 'c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
  })
  @ApiResponse({
    status: 200,
    description: 'Document successfully removed',
    schema: {
      example: {
        message: 'Document successfully deleted',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete APPROVED documents',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot delete APPROVED documents',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/me/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
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
        path: '/api/v1/caregivers/me/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
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
        path: '/api/v1/caregivers/me/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
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
        path: '/api/v1/caregivers/me/documents/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
      },
    },
  })
  async deleteDocument(@CurrentUser() user: User, @Param('id') id: string) {
    return this.caregiversService.deleteDocument(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public caregiver profile with privacy guard protection' })
  @ApiParam({
    name: 'id',
    description: 'Caregiver profile UUID',
    example: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
  })
  @ApiResponse({
    status: 200,
    description: 'Public caregiver profile with sensitive data masked',
    schema: {
      example: {
        id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        bio: 'Certified nurse assistant with 6 years experience in elderly care and rehabilitation.',
        yearsOfExperience: 6,
        specialties: ['ELDERLY_CARE'],
        hourlyRate: 25000,
        dailyRate8h: 120000,
        dailyRate12h: 170000,
        overnightRate: 190000,
        city: 'Bogotá',
        neighborhoods: ['Usaquén', 'Chapinero'],
        maxCoverageRadiusKm: 15,
        ratingAverage: '4.90',
        totalReviews: 12,
        isDocumentVerified: true,
        user: {
          id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
          firstName: 'Carlos',
          lastName: 'Mendoza',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Caregiver not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Caregiver profile not found for id: 7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
      },
    },
  })
  async getPublicProfile(@Param('id') id: string) {
    return this.caregiversService.getPublicProfile(id);
  }
}
