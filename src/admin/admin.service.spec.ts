import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { User } from '../users/entities/user.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { DocumentType } from '../common/enums/document-type.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';

describe('AdminService', () => {
  let service: AdminService;
  let documentRepo: jest.Mocked<Partial<Repository<CaregiverDocument>>>;
  let profileRepo: jest.Mocked<Partial<Repository<CaregiverProfile>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let jobOfferRepo: jest.Mocked<Partial<Repository<JobOffer>>>;

  const mockCaregiverUser: User = {
    id: 'caregiver-uuid-1',
    email: 'caregiver@example.com',
    firstName: 'Lucia',
    lastName: 'Vargas',
    role: UserRole.CAREGIVER,
    isActive: true,
    suspensionReason: null,
  } as User;

  const mockClientUser: User = {
    id: 'client-uuid-1',
    email: 'client@example.com',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    role: UserRole.CLIENT,
    isActive: true,
    suspensionReason: null,
  } as User;

  const mockAdminUser: User = {
    id: 'admin-uuid-1',
    email: 'admin@careconnect.com',
    firstName: 'Admin',
    lastName: 'Super',
    role: UserRole.ADMIN,
    isActive: true,
  } as User;

  const mockProfile: CaregiverProfile = {
    id: 'profile-uuid-1',
    userId: 'caregiver-uuid-1',
    city: 'Bogota',
    isDocumentVerified: false,
    isPublic: true,
    user: mockCaregiverUser,
  } as CaregiverProfile;

  const mockDocument: CaregiverDocument = {
    id: 'doc-uuid-1',
    caregiverProfileId: 'profile-uuid-1',
    caregiverProfile: mockProfile,
    documentType: DocumentType.ID_CARD,
    fileUrl: 'https://storage.careconnect.com/id.pdf',
    verificationStatus: VerificationStatus.PENDING,
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as CaregiverDocument;

  beforeEach(async () => {
    documentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => entity as CaregiverDocument),
    };

    profileRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 } as any),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (user) => user as User),
    };

    jobOfferRepo = {
      update: jest.fn().mockResolvedValue({ affected: 2 } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(CaregiverDocument),
          useValue: documentRepo,
        },
        {
          provide: getRepositoryToken(CaregiverProfile),
          useValue: profileRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(JobOffer),
          useValue: jobOfferRepo,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingDocuments', () => {
    it('should return pending documents with caregiver information', async () => {
      (documentRepo.find as jest.Mock).mockResolvedValue([mockDocument]);

      const result = await service.getPendingDocuments();

      expect(documentRepo.find).toHaveBeenCalledWith({
        where: { verificationStatus: VerificationStatus.PENDING },
        relations: {
          caregiverProfile: {
            user: true,
          },
        },
        order: { createdAt: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc-uuid-1');
      expect(result[0].caregiver).toEqual({
        id: 'caregiver-uuid-1',
        firstName: 'Lucia',
        lastName: 'Vargas',
        email: 'caregiver@example.com',
        city: 'Bogota',
      });
    });
  });

  describe('verifyDocument', () => {
    it('should approve document and automatically update isDocumentVerified if ID_CARD and CRIMINAL_RECORD are approved', async () => {
      (documentRepo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });
      (documentRepo.find as jest.Mock).mockResolvedValue([
        {
          documentType: DocumentType.ID_CARD,
          verificationStatus: VerificationStatus.APPROVED,
        },
        {
          documentType: DocumentType.CRIMINAL_RECORD,
          verificationStatus: VerificationStatus.APPROVED,
        },
      ]);

      const result = await service.verifyDocument('doc-uuid-1', {
        status: VerificationStatus.APPROVED,
      });

      expect(documentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: VerificationStatus.APPROVED }),
      );
      expect(profileRepo.update).toHaveBeenCalledWith('profile-uuid-1', {
        isDocumentVerified: true,
      });
      expect(result.verificationStatus).toBe(VerificationStatus.APPROVED);
    });

    it('should reject document with admin notes', async () => {
      (documentRepo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      const result = await service.verifyDocument('doc-uuid-1', {
        status: VerificationStatus.REJECTED,
        adminNotes: 'Document is illegible, please upload a clearer scan.',
      });

      expect(documentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: VerificationStatus.REJECTED,
          adminNotes: 'Document is illegible, please upload a clearer scan.',
        }),
      );
      expect(profileRepo.update).not.toHaveBeenCalled();
      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED);
    });

    it('should throw BadRequestException if adminNotes is missing when rejecting document', async () => {
      (documentRepo.findOne as jest.Mock).mockResolvedValue({ ...mockDocument });

      await expect(
        service.verifyDocument('doc-uuid-1', {
          status: VerificationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if document does not exist', async () => {
      (documentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifyDocument('missing-doc', {
          status: VerificationStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserStatus', () => {
    it('should suspend caregiver and cascade hide profile (isPublic = false)', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockCaregiverUser });

      const result = await service.updateUserStatus('caregiver-uuid-1', {
        isActive: false,
        suspensionReason: 'Breach of terms of service',
      });

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          suspensionReason: 'Breach of terms of service',
        }),
      );
      expect(profileRepo.update).toHaveBeenCalledWith(
        { userId: 'caregiver-uuid-1' },
        { isPublic: false },
      );
      expect(result.isActive).toBe(false);
    });

    it('should suspend client and cascade cancel open job offers', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockClientUser });

      const result = await service.updateUserStatus('client-uuid-1', {
        isActive: false,
        suspensionReason: 'Reported fraudulent activities',
      });

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          suspensionReason: 'Reported fraudulent activities',
        }),
      );
      expect(jobOfferRepo.update).toHaveBeenCalledWith(
        { clientId: 'client-uuid-1', status: JobOfferStatus.OPEN },
        { status: JobOfferStatus.CANCELLED },
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException when suspending user without suspensionReason', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockClientUser });

      await expect(
        service.updateUserStatus('client-uuid-1', {
          isActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when attempting to suspend an administrator account', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockAdminUser });

      await expect(
        service.updateUserStatus('admin-uuid-1', {
          isActive: false,
          suspensionReason: 'Cannot suspend admin',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reactivate user and clear suspensionReason', async () => {
      const suspendedUser = {
        ...mockCaregiverUser,
        isActive: false,
        suspensionReason: 'Previous issue resolved',
      };
      (userRepo.findOne as jest.Mock).mockResolvedValue(suspendedUser);

      const result = await service.updateUserStatus('caregiver-uuid-1', {
        isActive: true,
      });

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          suspensionReason: null,
        }),
      );
      expect(result.isActive).toBe(true);
      expect(result.suspensionReason).toBeNull();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUserStatus('missing-user', {
          isActive: false,
          suspensionReason: 'User not found test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivation ripple effects', () => {
    it('should make a reactivated caregiver visible in search again (isPublic = true)', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockCaregiverUser,
        isActive: false,
        suspensionReason: 'Resolved',
      });

      await service.updateUserStatus('caregiver-uuid-1', { isActive: true });

      expect(profileRepo.update).toHaveBeenCalledWith(
        { userId: 'caregiver-uuid-1' },
        { isPublic: true },
      );
    });

    it('should not touch caregiver profiles when reactivating a client', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockClientUser,
        isActive: false,
      });

      await service.updateUserStatus('client-uuid-1', { isActive: true });

      expect(profileRepo.update).not.toHaveBeenCalled();
      expect(jobOfferRepo.update).not.toHaveBeenCalled();
    });

    it('should require a non-blank suspensionReason when suspending', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockClientUser });

      await expect(
        service.updateUserStatus('client-uuid-1', { isActive: false, suspensionReason: '   ' }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });
});
