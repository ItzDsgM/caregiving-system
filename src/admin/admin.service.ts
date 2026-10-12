import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { User } from '../users/entities/user.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { VerifyDocumentDto } from './dtos/verify-document.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
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
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { caregiverProfile: true },
    });

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
}
