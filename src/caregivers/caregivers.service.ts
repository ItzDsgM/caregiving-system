import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { UpdateCaregiverProfileDto } from './dtos/update-caregiver-profile.dto';
import { UploadDocumentDto } from './dtos/upload-document.dto';
import { VerificationStatus } from '../common/enums/verification-status.enum';

@Injectable()
export class CaregiversService {
  private readonly logger = new Logger(CaregiversService.name);

  constructor(
    @InjectRepository(CaregiverProfile)
    private readonly profileRepository: Repository<CaregiverProfile>,
    @InjectRepository(CaregiverDocument)
    private readonly documentRepository: Repository<CaregiverDocument>,
  ) {}

  async getMyProfile(userId: string): Promise<CaregiverProfile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: { documents: true },
    });

    if (!profile) {
      throw new NotFoundException('Caregiver profile was not found');
    }

    return profile;
  }

  async updateMyProfile(
    userId: string,
    updateDto: UpdateCaregiverProfileDto,
  ): Promise<CaregiverProfile> {
    const profile = await this.getMyProfile(userId);

    Object.assign(profile, updateDto);

    return this.profileRepository.save(profile);
  }

  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    uploadDto: UploadDocumentDto,
  ): Promise<CaregiverDocument> {
    const profile = await this.getMyProfile(userId);

    if (!file) {
      throw new BadRequestException('A file is required for document upload');
    }

    const fileUrl = `/uploads/documents/${file.filename}`;

    const document = this.documentRepository.create({
      caregiverProfileId: profile.id,
      documentType: uploadDto.documentType,
      fileUrl,
      verificationStatus: VerificationStatus.PENDING,
    });

    return this.documentRepository.save(document);
  }

  async deleteDocument(
    userId: string,
    documentId: string,
  ): Promise<{ message: string }> {
    const profile = await this.getMyProfile(userId);

    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" was not found`);
    }

    if (document.caregiverProfileId !== profile.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this document',
      );
    }

    if (document.verificationStatus === VerificationStatus.APPROVED) {
      throw new BadRequestException(
        'Approved documents cannot be deleted from the system',
      );
    }

    // Try deleting physical file from disk
    try {
      const filePath = path.resolve('.' + document.fileUrl);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to delete physical file for document ${documentId}: ${(error as Error).message}`,
      );
    }

    await this.documentRepository.remove(document);

    return { message: 'Document removed successfully' };
  }
}
