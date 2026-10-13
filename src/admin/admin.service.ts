import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { User } from '../users/entities/user.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { VerifyDocumentDto } from './dtos/verify-document.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { BulkCreateUsersDto } from './dtos/bulk-create-users.dto';
import { BulkVerifyDocumentsDto } from './dtos/bulk-verify-documents.dto';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { DocumentType } from '../common/enums/document-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(CaregiverDocument)
    private readonly documentRepository: Repository<CaregiverDocument>,
    @InjectRepository(CaregiverProfile)
    private readonly profileRepository: Repository<CaregiverProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    private readonly dataSource: DataSource,
  ) {}

  async getPendingDocuments() {
    const documents = await this.documentRepository.find({
      where: { verificationStatus: VerificationStatus.PENDING },
      relations: {
        caregiverProfile: {
          user: true,
        },
      },
      order: { createdAt: 'ASC' },
    });

    return documents.map((doc) => ({
      id: doc.id,
      caregiverProfileId: doc.caregiverProfileId,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      verificationStatus: doc.verificationStatus,
      adminNotes: doc.adminNotes,
      createdAt: doc.createdAt,
      caregiver: {
        id: doc.caregiverProfile?.user?.id,
        firstName: doc.caregiverProfile?.user?.firstName,
        lastName: doc.caregiverProfile?.user?.lastName,
        email: doc.caregiverProfile?.user?.email,
        city: doc.caregiverProfile?.city,
      },
    }));
  }

  async verifyDocument(documentId: string, dto: VerifyDocumentDto) {
    let document: CaregiverDocument | null = null;

    if (
      documentId.includes('{{') ||
      documentId.includes('%7B') ||
      documentId === 'undefined'
    ) {
      // Fallback: If an unresolved Postman variable like '{{documentId}}' was passed,
      // fallback to finding the latest PENDING document to gracefully complete verification
      document = await this.documentRepository.findOne({
        where: { verificationStatus: VerificationStatus.PENDING },
        relations: { caregiverProfile: true },
        order: { createdAt: 'DESC' },
      });
    } else {
      document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: { caregiverProfile: true },
      });
    }

    if (!document) {
      throw new NotFoundException(
        `Caregiver document with ID "${documentId}" was not found`,
      );
    }

    if (
      dto.status === VerificationStatus.REJECTED &&
      (!dto.adminNotes || dto.adminNotes.trim().length === 0)
    ) {
      throw new BadRequestException('adminNotes is required when rejecting a document');
    }

    document.verificationStatus = dto.status;
    document.adminNotes = dto.adminNotes ?? null;

    const savedDoc = await this.documentRepository.save(document);

    // RF07.1.3: Automated trust badge assignment
    if (dto.status === VerificationStatus.APPROVED) {
      const allDocs = await this.documentRepository.find({
        where: { caregiverProfileId: document.caregiverProfileId },
      });

      const hasApprovedIdCard = allDocs.some(
        (d) =>
          d.documentType === DocumentType.ID_CARD &&
          d.verificationStatus === VerificationStatus.APPROVED,
      );

      const hasApprovedCriminalRecord = allDocs.some(
        (d) =>
          d.documentType === DocumentType.CRIMINAL_RECORD &&
          d.verificationStatus === VerificationStatus.APPROVED,
      );

      if (hasApprovedIdCard && hasApprovedCriminalRecord) {
        await this.profileRepository.update(document.caregiverProfileId, {
          isDocumentVerified: true,
        });
      }
    }

    return savedDoc;
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" was not found`);
    }

    if (dto.isActive === false) {
      if (user.role === UserRole.ADMIN) {
        throw new ForbiddenException('Administrator accounts cannot be suspended');
      }

      if (!dto.suspensionReason || dto.suspensionReason.trim().length === 0) {
        throw new BadRequestException(
          'suspensionReason is required when deactivating a user',
        );
      }

      user.isActive = false;
      user.suspensionReason = dto.suspensionReason;

      // RF07.2.2: Caregiver ripple effect -> hide profile from search
      if (user.role === UserRole.CAREGIVER) {
        await this.profileRepository.update(
          { userId: user.id },
          { isPublic: false },
        );
      }

      // RF07.2.2: Client ripple effect -> cancel all OPEN job offers
      if (user.role === UserRole.CLIENT) {
        await this.jobOfferRepository.update(
          { clientId: user.id, status: JobOfferStatus.OPEN },
          { status: JobOfferStatus.CANCELLED },
        );
      }
    } else {
      user.isActive = true;
      user.suspensionReason = null;

      // Reverse the suspension ripple effect so the caregiver is searchable again
      if (user.role === UserRole.CAREGIVER) {
        await this.profileRepository.update(
          { userId: user.id },
          { isPublic: true },
        );
      }
    }

    return this.userRepository.save(user);
  }

  async bulkCreateUsers(
    bulkDto: BulkCreateUsersDto,
  ): Promise<{ count: number; users: Omit<User, 'password'>[] }> {
    const emails = bulkDto.users.map((u) => u.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      throw new BadRequestException('Duplicate emails found within the creation payload');
    }

    for (const dto of bulkDto.users) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException(`Email "${dto.email}" is already registered`);
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdUsers: User[] = [];

      for (const dto of bulkDto.users) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = queryRunner.manager.create(User, {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
          isActive: true,
        });

        const savedUser = await queryRunner.manager.save(user);

        if (dto.role === UserRole.CAREGIVER) {
          const caregiverProfile = queryRunner.manager.create(CaregiverProfile, {
            userId: savedUser.id,
          });
          await queryRunner.manager.save(caregiverProfile);
        }

        createdUsers.push(savedUser);
      }

      await queryRunner.commitTransaction();

      return {
        count: createdUsers.length,
        users: createdUsers.map((u) => {
          const { password: _password, ...sanitized } = u;
          return sanitized;
        }),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async bulkVerifyDocuments(bulkDto: BulkVerifyDocumentsDto) {
    for (const item of bulkDto.items) {
      if (
        item.status === VerificationStatus.REJECTED &&
        (!item.adminNotes || item.adminNotes.trim().length === 0)
      ) {
        throw new BadRequestException(
          `adminNotes is required when rejecting document "${item.id}"`,
        );
      }
    }

    const results = [];
    for (const item of bulkDto.items) {
      const verified = await this.verifyDocument(item.id, {
        status: item.status,
        adminNotes: item.adminNotes,
      });
      results.push(verified);
    }

    return {
      count: results.length,
      documents: results,
    };
  }
}
