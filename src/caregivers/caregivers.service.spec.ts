import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
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
      createQueryBuilder: jest.fn(),
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

  it('should create and persist a document when uploadDto.file string fallback is provided', async () => {
    (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);

    const result = await caregiversService.uploadDocument(
      'user-uuid-1',
      undefined,
      { documentType: DocumentType.ID_CARD, file: 'archivo1.png' },
    );

    expect(documentRepository.create).toHaveBeenCalledWith({
      caregiverProfileId: mockProfile.id,
      documentType: DocumentType.ID_CARD,
      fileUrl: '/uploads/documents/archivo1.png',
      verificationStatus: VerificationStatus.PENDING,
    });
    expect(documentRepository.save).toHaveBeenCalled();
    expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
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

  describe('search', () => {
    it('should query caregivers with filters and return paginated data with meta', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        firstName: 'Maria',
        lastName: 'Lopez',
        email: 'private@example.com',
        phone: '+573001234567',
      };

      const mockProfileWithUser = {
        ...mockProfile,
        user: mockUser,
      };

      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProfileWithUser], 1]),
      };

      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await caregiversService.search({
        city: 'Bogota',
        specialty: CareSpecialty.ELDERLY_CARE,
        minPrice: 20,
        maxPrice: 30,
        minRating: 4,
        onlyVerified: true,
        sortBy: 'price_asc',
        page: 1,
        limit: 10,
      });

      expect(mockQueryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'profile.user',
        'user',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'profile.isPublic = :isPublic',
        { isPublic: true },
      );
      expect(result.data).toHaveLength(1);
      // Ensure private contact info is stripped (RF04.1.5)
      expect(result.data[0]).not.toHaveProperty('email');
      expect(result.data[0]).not.toHaveProperty('phone');
      expect(result.data[0].firstName).toBe('Maria');
      expect(result.meta).toEqual({
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile with approved documents only and omitted contact info', async () => {
      const approvedDoc: CaregiverDocument = {
        id: 'doc-approved-1',
        caregiverProfileId: mockProfile.id,
        caregiverProfile: mockProfile,
        documentType: DocumentType.ACADEMIC_DEGREE,
        fileUrl: '/uploads/documents/degree.pdf',
        verificationStatus: VerificationStatus.APPROVED,
        adminNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pendingDoc: CaregiverDocument = {
        id: 'doc-pending-1',
        caregiverProfileId: mockProfile.id,
        caregiverProfile: mockProfile,
        documentType: DocumentType.ID_CARD,
        fileUrl: '/uploads/documents/id.pdf',
        verificationStatus: VerificationStatus.PENDING,
        adminNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const profileWithDocs = {
        ...mockProfile,
        user: {
          id: 'user-uuid-1',
          firstName: 'Maria',
          lastName: 'Lopez',
          email: 'secret@email.com',
          phone: '+1234567890',
          isActive: true,
        },
        documents: [approvedDoc, pendingDoc],
      };

      (profileRepository.findOne as jest.Mock).mockResolvedValue(profileWithDocs);

      const result = await caregiversService.getPublicProfile('profile-uuid-1');

      expect(result).toHaveProperty('id', 'profile-uuid-1');
      expect(result).toHaveProperty('firstName', 'Maria');
      // Ensure private contact details are withheld
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      // Ensure only APPROVED documents are publicly listed
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].id).toBe('doc-approved-1');
    });

    it('should throw NotFoundException if public profile does not exist or user is inactive', async () => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        caregiversService.getPublicProfile('missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('search - sorting & edge branches', () => {
    const buildQb = (rows: any[] = [], total = 0) => ({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    });

    it.each([
      ['price_desc', 'profile.hourlyRate', 'DESC'],
      ['rating_desc', 'profile.ratingAverage', 'DESC'],
      ['experience_desc', 'profile.yearsOfExperience', 'DESC'],
      ['price_asc', 'profile.hourlyRate', 'ASC'],
    ] as const)('should sort by %s (RF04.1.3)', async (sortBy, column, direction) => {
      const qb = buildQb();
      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await caregiversService.search({ sortBy });

      expect(qb.orderBy).toHaveBeenCalledWith(column, direction);
    });

    it('should default to rating then newest and apply defaults page=1, limit=10', async () => {
      const qb = buildQb();
      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await caregiversService.search({});

      expect(qb.orderBy).toHaveBeenCalledWith('profile.ratingAverage', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('profile.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it('should compute skip and totalPages for later pages', async () => {
      const qb = buildQb([], 45);
      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await caregiversService.search({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should only add the filters that were provided', async () => {
      const qb = buildQb();
      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await caregiversService.search({ city: 'cali' });

      // base: isActive + role, plus city
      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith('profile.city ILIKE :city', { city: '%cali%' });
    });

    it('should tolerate profiles without a joined user', async () => {
      const qb = buildQb([{ ...mockProfile, user: undefined }], 1);
      (profileRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await caregiversService.search({});

      expect(result.data[0].firstName).toBeUndefined();
    });
  });

  describe('deleteDocument - physical file handling', () => {
    const makeDoc = (fileUrl: string) =>
      ({
        id: 'doc-fs',
        caregiverProfileId: mockProfile.id,
        verificationStatus: VerificationStatus.PENDING,
        fileUrl,
      }) as CaregiverDocument;

    beforeEach(() => {
      (profileRepository.findOne as jest.Mock).mockResolvedValue(mockProfile);
    });

    it('should unlink the physical file when it exists', async () => {
      const name = `jest-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
      const dir = path.resolve('./uploads/documents');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, name);
      fs.writeFileSync(filePath, 'x');
      (documentRepository.findOne as jest.Mock).mockResolvedValue(
        makeDoc(`/uploads/documents/${name}`),
      );

      await caregiversService.deleteDocument('user-uuid-1', 'doc-fs');

      expect(fs.existsSync(filePath)).toBe(false);
      expect(documentRepository.remove).toHaveBeenCalled();
    });

    it('should skip unlink and still remove the record when the file is already gone', async () => {
      (documentRepository.findOne as jest.Mock).mockResolvedValue(
        makeDoc('/uploads/documents/never-existed-file.pdf'),
      );

      const result = await caregiversService.deleteDocument('user-uuid-1', 'doc-fs');

      expect(documentRepository.remove).toHaveBeenCalled();
      expect(result.message).toBe('Document removed successfully');
    });

    it('should still remove the DB record when the physical file cannot be deleted', async () => {
      // unlink() on a directory fails, simulating an FS error
      (documentRepository.findOne as jest.Mock).mockResolvedValue(makeDoc('/uploads'));

      const result = await caregiversService.deleteDocument('user-uuid-1', 'doc-fs');

      expect(documentRepository.remove).toHaveBeenCalled();
      expect(result.message).toBe('Document removed successfully');
    });
  });
});
