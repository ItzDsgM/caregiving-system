import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
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
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let queryRunner: jest.Mocked<Partial<QueryRunner>>;
  let mockManager: {
    create: jest.Mock;
    save: jest.Mock;
  };

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

    mockManager = {
      create: jest.fn((entityClass, data) => {
        if (entityClass === User) {
          return { id: 'created-user-id', ...data } as User;
        }
        if (entityClass === CaregiverProfile) {
          return { id: 'created-profile-id', ...data } as CaregiverProfile;
        }
        return data;
      }),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: mockManager as any,
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner as QueryRunner),
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
        {
          provide: DataSource,
          useValue: dataSource,
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

  describe('bulkCreateUsers', () => {
    it('should throw BadRequestException if duplicate emails exist within the payload', async () => {
      await expect(
        service.bulkCreateUsers({
          users: [
            {
              email: 'duplicate@example.com',
              password: 'Password123',
              firstName: 'Test1',
              lastName: 'User1',
              phone: '+573001234567',
              role: UserRole.CLIENT,
            },
            {
              email: 'DUPLICATE@EXAMPLE.COM',
              password: 'Password123',
              firstName: 'Test2',
              lastName: 'User2',
              phone: '+573001234568',
              role: UserRole.CLIENT,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if any user is already registered', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValueOnce(mockClientUser);

      await expect(
        service.bulkCreateUsers({
          users: [
            {
              email: mockClientUser.email,
              password: 'Password123',
              firstName: 'Test',
              lastName: 'User',
              phone: '+573001234567',
              role: UserRole.CLIENT,
            },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create users and caregiver profiles in transaction and return sanitized users', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.bulkCreateUsers({
        users: [
          {
            email: 'newcaregiver@example.com',
            password: 'Password123',
            firstName: 'Caregiver',
            lastName: 'One',
            phone: '+573001234567',
            role: UserRole.CAREGIVER,
          },
          {
            email: 'newclient@example.com',
            password: 'Password123',
            firstName: 'Client',
            lastName: 'One',
            phone: '+573001234568',
            role: UserRole.CLIENT,
          },
        ],
      });

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalledWith(User, expect.objectContaining({ email: 'newcaregiver@example.com' }));
      expect(mockManager.create).toHaveBeenCalledWith(CaregiverProfile, expect.objectContaining({ userId: 'created-user-id' }));
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result.count).toBe(2);
      expect(result.users[0]).not.toHaveProperty('password');
      expect(result.users[1]).not.toHaveProperty('password');
    });

    it('should rollback and release transaction if an error occurs', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      mockManager.save.mockRejectedValueOnce(new Error('Database write error'));

      await expect(
        service.bulkCreateUsers({
          users: [
            {
              email: 'erroruser@example.com',
              password: 'Password123',
              firstName: 'Err',
              lastName: 'User',
              phone: '+573001234567',
              role: UserRole.CLIENT,
            },
          ],
        }),
      ).rejects.toThrow('Database write error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('bulkVerifyDocuments', () => {
    it('should throw BadRequestException if a rejected item does not have adminNotes', async () => {
      await expect(
        service.bulkVerifyDocuments({
          items: [
            {
              id: 'doc-uuid-1',
              status: VerificationStatus.REJECTED,
              adminNotes: '   ',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify all documents and return results', async () => {
      const spyVerify = jest.spyOn(service, 'verifyDocument').mockResolvedValue(mockDocument);

      const result = await service.bulkVerifyDocuments({
        items: [
          {
            id: 'doc-uuid-1',
            status: VerificationStatus.APPROVED,
          },
          {
            id: 'doc-uuid-2',
            status: VerificationStatus.REJECTED,
            adminNotes: 'Document illegible',
          },
        ],
      });

      expect(spyVerify).toHaveBeenCalledTimes(2);
      expect(result.count).toBe(2);
      expect(result.documents).toEqual([mockDocument, mockDocument]);
    });
  });
});
