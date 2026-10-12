import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { Application } from '../applications/entities/application.entity';
import { ContactRequest } from '../contact-requests/entities/contact-request.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: jest.Mocked<Partial<Repository<Review>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let profileRepo: jest.Mocked<Partial<Repository<CaregiverProfile>>>;
  let applicationRepo: jest.Mocked<Partial<Repository<Application>>>;
  let contactRequestRepo: jest.Mocked<Partial<Repository<ContactRequest>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let queryRunner: jest.Mocked<Partial<QueryRunner>>;
  let eventEmitter: jest.Mocked<Partial<EventEmitter2>>;

  const mockClient: User = {
    id: 'client-1',
    email: 'client@example.com',
    phone: '+573001234567',
    firstName: 'Maria',
    lastName: 'Lopez',
    role: UserRole.CLIENT,
  } as User;

  const mockCaregiver: User = {
    id: 'caregiver-1',
    email: 'caregiver@example.com',
    phone: '+573109876543',
    firstName: 'Ana',
    lastName: 'Gomez',
    role: UserRole.CAREGIVER,
  } as User;

  const mockReview: Review = {
    id: 'review-1',
    clientId: 'client-1',
    client: mockClient,
    caregiverId: 'caregiver-1',
    caregiver: mockCaregiver,
    rating: 5,
    comment: 'Exceptional caregiver, very punctual and caring with my mother.',
    createdAt: new Date(),
  } as Review;

  beforeEach(async () => {
    reviewRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    profileRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    applicationRepo = {
      findOne: jest.fn(),
    };

    contactRequestRepo = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        create: jest.fn().mockImplementation((entityClass, data) => ({ id: 'review-1', ...data })),
        save: jest.fn().mockImplementation(async (entityClass, data) => data),
        count: jest.fn().mockResolvedValue(1),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avgRating: '4.80' }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      } as any,
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner as QueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: reviewRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(CaregiverProfile),
          useValue: profileRepo,
        },
        {
          provide: getRepositoryToken(Application),
          useValue: applicationRepo,
        },
        {
          provide: getRepositoryToken(ContactRequest),
          useValue: contactRequestRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const createDto = {
      rating: 5,
      comment: 'Exceptional caregiver, very punctual and caring with my mother.',
    };

    it('should successfully post review and atomically recalculate rating metrics with accepted application', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.ACCEPTED,
      });
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(null);
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.createReview('client-1', 'caregiver-1', createDto);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        CaregiverProfile,
        { userId: 'caregiver-1' },
        { totalReviews: 1, ratingAverage: 4.8 },
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'review.created',
        expect.objectContaining({
          caregiverId: 'caregiver-1',
          clientId: 'client-1',
          rating: 5,
        }),
      );
      expect(result.rating).toBe(5);
    });

    it('should successfully post review when prior accepted contact request exists', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'req-1',
        status: ContactRequestStatus.ACCEPTED,
      });
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.createReview('client-1', 'caregiver-1', createDto);

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.rating).toBe(5);
    });

    it('should throw BadRequestException if client attempts to review their own profile', async () => {
      await expect(
        service.createReview('same-id', 'same-id', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if caregiver does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReview('client-1', 'missing-caregiver', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if neither accepted application nor contact request exists', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createReview('client-1', 'caregiver-1', createDto),
      ).rejects.toThrow(
        new ForbiddenException('No puedes calificar a una cuidadora sin interacción previa comprobada'),
      );
    });

    it('should throw ConflictException if client already submitted a review for this caregiver', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue({ id: 'app-1' });
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(mockReview);

      await expect(
        service.createReview('client-1', 'caregiver-1', createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should rollback transaction and release connection on database error', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue({ id: 'app-1' });
      (reviewRepo.findOne as jest.Mock).mockResolvedValue(null);

      (queryRunner.manager.save as jest.Mock).mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(
        service.createReview('client-1', 'caregiver-1', createDto),
      ).rejects.toThrow('Database connection lost');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findByCaregiver', () => {
    it('should return paginated reviews with sanitized client details', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (reviewRepo.findAndCount as jest.Mock).mockResolvedValue([[mockReview], 1]);

      const result = await service.findByCaregiver('caregiver-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('review-1');
      expect(result.data[0].client).toEqual({
        id: 'client-1',
        firstName: 'Maria',
        lastName: 'Lopez',
      });
      expect(result.data[0].client).not.toHaveProperty('phone');
      expect(result.data[0].client).not.toHaveProperty('email');
      expect(result.meta).toEqual({
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it('should throw NotFoundException if caregiver does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findByCaregiver('missing-caregiver', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
