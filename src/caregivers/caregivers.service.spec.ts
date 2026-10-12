import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CaregiversService } from './caregivers.service';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { UpdateCaregiverProfileDto } from './dtos/update-caregiver-profile.dto';
import { UploadDocumentDto } from './dtos/upload-document.dto';
import { DocumentType } from '../common/enums/document-type.enum';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { CareSpecialty } from '../common/enums/care-specialty.enum';
import { DayOfWeek } from '../common/enums/day-of-week.enum';
import { ShiftType } from '../common/enums/shift-type.enum';

describe('CaregiversService', () => {
  let caregiversService: CaregiversService;
  let profileRepository: jest.Mocked<Partial<Repository<CaregiverProfile>>>;
  let documentRepository: jest.Mocked<Partial<Repository<CaregiverDocument>>>;

  const mockProfile: CaregiverProfile = {
    id: 'profile-uuid-1',
    userId: 'user-uuid-1',
    user: {} as any,
    bio: 'Experienced caregiver specializing in elderly assistance and pediatric nursing care.',
    yearsOfExperience: 5,
    specialties: [CareSpecialty.ELDERLY_CARE],
    hourlyRate: 25.0,
    dailyRate8h: 180.0,
    dailyRate12h: 260.0,
    overnightRate: 150.0,
    city: 'Bogota',
    neighborhoods: ['Chapinero', 'Usaquen'],
    maxCoverageRadiusKm: 15,
    availability: [{ day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] }],
    ratingAverage: 4.8,
    totalReviews: 10,
    isDocumentVerified: false,
    isPublic: true,
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    profileRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    documentRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => ({ id: 'doc-uuid-1', ...data } as CaregiverDocument)),
      save: jest.fn().mockImplementation(async (entity) => entity),
      remove: jest.fn().mockImplementation(async (entity) => entity),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaregiversService,
        {
          provide: getRepositoryToken(CaregiverProfile),
          useValue: profileRepository,
        },
        {
          provide: getRepositoryToken(CaregiverDocument),
          useValue: documentRepository,
        },
      ],
    }).compile();

    caregiversService = module.get<CaregiversService>(CaregiversService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should return the caregiver profile with documents', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const result = await caregiversService.getMyProfile('user-uuid-1');

      expect(profileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: { documents: true },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        caregiversService.getMyProfile('missing-user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('should update profile fields and return updated entity', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue({ ...mockProfile });

      const updateDto: UpdateCaregiverProfileDto = {
        bio: 'Updated bio with more than 50 characters of descriptive text about caregiving expertise.',
        hourlyRate: 35.0,
        city: 'Medellin',
      };

      const result = await caregiversService.updateMyProfile('user-uuid-1', updateDto);

      expect(profileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          hourlyRate: 35.0,
          city: 'Medellin',
        }),
      );
      expect(result.hourlyRate).toBe(35.0);
      expect(result.city).toBe('Medellin');
    });

    it('should throw NotFoundException if profile not found during update', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        caregiversService.updateMyProfile('missing-user', { hourlyRate: 30 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadDocument', () => {
    const mockFile = {
      filename: 'uuid-test.pdf',
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      path: '/uploads/documents/uuid-test.pdf',
    } as Express.Multer.File;

    const uploadDto: UploadDocumentDto = {
      documentType: DocumentType.ID_CARD,
    };

  it('should create and persist a document with PENDING status', async () => {
    (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

    const result = await caregiversService.uploadDocument(
      'user-uuid-1',
      mockFile,
      uploadDto,
    );

    expect(documentRepository.create).toHaveBeenCalledWith({
      caregiverProfileId: mockProfile.id,
      documentType: DocumentType.ID_CARD,
      fileUrl: '/uploads/documents/uuid-test.pdf',
      verificationStatus: VerificationStatus.PENDING,
    });
    expect(documentRepository.save).toHaveBeenCalled();
    expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
  });

  it('should throw BadRequestException if file is not provided', async () => {
    (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

    await expect(
      caregiversService.uploadDocument(
        'user-uuid-1',
        null as any,
        uploadDto,
      ),
    ).rejects.toThrow(BadRequestException);
  });
  });

  describe('deleteDocument', () => {
    it('should delete document when verification status is PENDING', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const pendingDoc: CaregiverDocument = {
        id: 'doc-uuid-1',
        caregiverProfileId: mockProfile.id,
        caregiverProfile: mockProfile,
        documentType: DocumentType.ID_CARD,
        fileUrl: '/uploads/documents/uuid-test.pdf',
        verificationStatus: VerificationStatus.PENDING,
        adminNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (documentRepository.findOne as jest.Mock).mockResolvedValue(pendingDoc);

      const result = await caregiversService.deleteDocument(
        'user-uuid-1',
        'doc-uuid-1',
      );

      expect(documentRepository.remove).toHaveBeenCalledWith(pendingDoc);
      expect(result.message).toBe('Document removed successfully');
    });

    it('should delete document when verification status is REJECTED', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const rejectedDoc: CaregiverDocument = {
        id: 'doc-uuid-2',
        caregiverProfileId: mockProfile.id,
        caregiverProfile: mockProfile,
        documentType: DocumentType.CRIMINAL_RECORD,
        fileUrl: '/uploads/documents/uuid-record.pdf',
        verificationStatus: VerificationStatus.REJECTED,
        adminNotes: 'Illegible scan',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (documentRepository.findOne as jest.Mock).mockResolvedValue(rejectedDoc);

      const result = await caregiversService.deleteDocument(
        'user-uuid-1',
        'doc-uuid-2',
      );

      expect(documentRepository.remove).toHaveBeenCalledWith(rejectedDoc);
      expect(result.message).toBe('Document removed successfully');
    });

    it('should throw BadRequestException when attempting to delete an APPROVED document', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const approvedDoc: CaregiverDocument = {
        id: 'doc-uuid-3',
        caregiverProfileId: mockProfile.id,
        caregiverProfile: mockProfile,
        documentType: DocumentType.ID_CARD,
        fileUrl: '/uploads/documents/uuid-id.pdf',
        verificationStatus: VerificationStatus.APPROVED,
        adminNotes: 'Verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (documentRepository.findOne as jest.Mock).mockResolvedValue(approvedDoc);

      await expect(
        caregiversService.deleteDocument('user-uuid-1', 'doc-uuid-3'),
      ).rejects.toThrow(BadRequestException);
      expect(documentRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if document belongs to a different caregiver', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

      const foreignDoc: CaregiverDocument = {
        id: 'foreign-doc-id',
        caregiverProfileId: 'other-profile-uuid',
        caregiverProfile: {} as any,
        documentType: DocumentType.ID_CARD,
        fileUrl: '/uploads/documents/other.pdf',
        verificationStatus: VerificationStatus.PENDING,
        adminNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (documentRepository.findOne as jest.Mock).mockResolvedValue(foreignDoc);

      await expect(
        caregiversService.deleteDocument('user-uuid-1', 'foreign-doc-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(documentRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if document does not exist', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);
      (documentRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        caregiversService.deleteDocument('user-uuid-1', 'missing-doc-id'),
      ).rejects.toThrow(NotFoundException);
      expect(documentRepository.remove).not.toHaveBeenCalled();
    });
  });
});
