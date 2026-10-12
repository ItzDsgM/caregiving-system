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

@Controller('caregivers')
@UseInterceptors(ClassSerializerInterceptor)
export class CaregiversController {
  constructor(private readonly caregiversService: CaregiversService) {}

  @Get('search')
  async search(@Query() searchDto: SearchCaregiversDto) {
    return this.caregiversService.search(searchDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  async getMyProfile(@CurrentUser() user: User) {
    return this.caregiversService.getMyProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateCaregiverProfileDto,
  ) {
    return this.caregiversService.updateMyProfile(user.id, updateDto);
  }

  @Post('me/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @UseInterceptors(FileInterceptor('file', multerOptions))
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  async deleteDocument(@CurrentUser() user: User, @Param('id') id: string) {
    return this.caregiversService.deleteDocument(user.id, id);
  }

  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    return this.caregiversService.getPublicProfile(id);
  }
}
