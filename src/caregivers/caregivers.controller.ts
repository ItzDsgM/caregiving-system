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
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { CaregiversService } from './caregivers.service';
import { UpdateCaregiverProfileDto } from './dtos/update-caregiver-profile.dto';
import { UploadDocumentDto } from './dtos/upload-document.dto';
import { SearchCaregiversDto } from './dtos/search-caregivers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

const uploadDir = './uploads/documents';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerOptions = {
  storage: diskStorage({
    destination: uploadDir,
    filename: (_req, file, callback) => {
      const ext = extname(file.originalname);
      const uniqueName = `${randomUUID()}${ext}`;
      callback(null, uniqueName);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid file type. Only PDF, JPEG, and PNG files are allowed',
        ),
        false,
      );
    }
    callback(null, true);
  },
};

@ApiTags('Caregivers')
@Controller('caregivers')
@UseInterceptors(ClassSerializerInterceptor)
export class CaregiversController {
  constructor(private readonly caregiversService: CaregiversService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and filter active verified caregivers' })
  @ApiResponse({ status: 200, description: 'Paginated list of matching caregivers' })
  async search(@Query() searchDto: SearchCaregiversDto) {
    return this.caregiversService.search(searchDto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Get current authenticated caregiver full profile' })
  @ApiResponse({ status: 200, description: 'Caregiver profile returned' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-caregiver roles' })
  async getMyProfile(@CurrentUser() user: User) {
    return this.caregiversService.getMyProfile(user.id);
  }

  @Patch('me')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Update current caregiver bio, specialties, rates, and schedule' })
  @ApiResponse({ status: 200, description: 'Caregiver profile successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-caregiver roles' })
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
        file: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          enum: ['ID_CARD', 'CRIMINAL_RECORD', 'HEALTH_CERTIFICATE', 'ACADEMIC_DEGREE'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded and set to PENDING status' })
  @ApiResponse({ status: 400, description: 'Invalid file or missing file' })
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required for document upload');
    }
    return this.caregiversService.uploadDocument(user.id, file, uploadDto);
  }

  @Delete('me/documents/:id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Delete document attachment (only PENDING or REJECTED)' })
  @ApiResponse({ status: 200, description: 'Document successfully removed' })
  @ApiResponse({ status: 400, description: 'Cannot delete APPROVED documents' })
  async deleteDocument(@CurrentUser() user: User, @Param('id') id: string) {
    return this.caregiversService.deleteDocument(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public caregiver profile with privacy guard protection' })
  @ApiResponse({ status: 200, description: 'Public caregiver profile with sensitive data masked' })
  @ApiResponse({ status: 404, description: 'Caregiver not found' })
  async getPublicProfile(@Param('id') id: string) {
    return this.caregiversService.getPublicProfile(id);
  }
}
