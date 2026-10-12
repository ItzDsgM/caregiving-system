import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { User } from '../users/entities/user.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationRepo: jest.Mocked<Partial<Repository<Application>>>;
  let jobOfferRepo: jest.Mocked<Partial<Repository<JobOffer>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
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

  const mockJobOffer: JobOffer = {
    id: 'offer-1',
    clientId: 'client-1',
    client: mockClient,
    title: 'Elderly Care Assistant',
    description: 'Looking for a caregiver',
    status: JobOfferStatus.OPEN,
  } as JobOffer;

  const mockApplication: Application = {
    id: 'app-1',
    jobOfferId: 'offer-1',
    jobOffer: mockJobOffer,
    caregiverId: 'caregiver-1',
    caregiver: mockCaregiver,
    coverLetter: 'I am certified and have 5 years experience',
    proposedRate: 25.0,
    status: ApplicationStatus.PENDING,
    appliedAt: new Date(),
  } as Application;

  beforeEach(async () => {
    applicationRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'app-1', ...dto } as Application)),
      save: jest.fn().mockImplementation(async (entity) => entity as Application),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    jobOfferRepo = {
      findOne: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: applicationRepo,
        },
        {
          provide: getRepositoryToken(JobOffer),
          useValue: jobOfferRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should successfully apply to an open job offer and emit event', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(mockJobOffer);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);

      const result = await service.apply('caregiver-1', 'offer-1', {
        coverLetter: 'I am certified and have 5 years experience',
        proposedRate: 25.0,
      });

      expect(applicationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobOfferId: 'offer-1',
          caregiverId: 'caregiver-1',
          coverLetter: 'I am certified and have 5 years experience',
          proposedRate: 25.0,
          status: ApplicationStatus.PENDING,
        }),
      );
      expect(applicationRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'application.created',
        expect.objectContaining({
          applicationId: 'app-1',
          offerTitle: 'Elderly Care Assistant',
          clientEmail: 'client@example.com',
          caregiverName: 'Ana Gomez',
        }),
      );
      expect(result.status).toBe(ApplicationStatus.PENDING);
    });

    it('should throw NotFoundException if job offer does not exist', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.apply('caregiver-1', 'invalid-offer', { coverLetter: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if job offer is not OPEN', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockJobOffer,
        status: JobOfferStatus.CLOSED,
      });

      await expect(
        service.apply('caregiver-1', 'offer-1', { coverLetter: 'Hello' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if caregiver already applied to this offer', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(mockJobOffer);
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(mockApplication);

      await expect(
        service.apply('caregiver-1', 'offer-1', { coverLetter: 'Hello again' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByJobOffer', () => {
    it('should return applications with masked contact data for owner client', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(mockJobOffer);
      (applicationRepo.find as jest.Mock).mockResolvedValue([mockApplication]);

      const result = await service.findByJobOffer('client-1', 'offer-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app-1');
      expect(result[0].caregiver).toEqual({
        id: 'caregiver-1',
        firstName: 'Ana',
        lastName: 'Gomez',
      });
      expect(result[0].caregiver).not.toHaveProperty('email');
      expect(result[0].caregiver).not.toHaveProperty('phone');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findByJobOffer('client-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is not offer owner', async () => {
      (jobOfferRepo.findOne as jest.Mock).mockResolvedValue(mockJobOffer);

      await expect(
        service.findByJobOffer('other-client', 'offer-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should reject application and emit event without contact unlock', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue({ ...mockApplication });

      const result = await service.updateStatus('client-1', 'app-1', ApplicationStatus.REJECTED);

      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ApplicationStatus.REJECTED }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'application.status_changed',
        expect.objectContaining({
          applicationId: 'app-1',
          status: ApplicationStatus.REJECTED,
          caregiverEmail: 'caregiver@example.com',
        }),
      );
      expect(result).not.toHaveProperty('unlockedContactDetails');
    });

    it('should accept application and unlock contact details with WhatsApp link', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue({ ...mockApplication });

      const result = await service.updateStatus('client-1', 'app-1', ApplicationStatus.ACCEPTED);

      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ApplicationStatus.ACCEPTED }),
      );
      expect(result).toHaveProperty('unlockedContactDetails');
      expect(result.unlockedContactDetails?.client).toEqual({
        firstName: 'Maria',
        lastName: 'Lopez',
        email: 'client@example.com',
        phone: '+573001234567',
        whatsappUrl: 'https://wa.me/573001234567',
      });
      expect(result.unlockedContactDetails?.caregiver).toEqual({
        firstName: 'Ana',
        lastName: 'Gomez',
        email: 'caregiver@example.com',
        phone: '+573109876543',
        whatsappUrl: 'https://wa.me/573109876543',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'application.status_changed',
        expect.objectContaining({
          status: ApplicationStatus.ACCEPTED,
          contactInfo: expect.objectContaining({
            clientPhone: '+573001234567',
            whatsappUrl: 'https://wa.me/573001234567',
          }),
        }),
      );
    });

    it('should throw ForbiddenException if requester is not offer owner', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(mockApplication);

      await expect(
        service.updateStatus('other-client', 'app-1', ApplicationStatus.ACCEPTED),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if application not found', async () => {
      (applicationRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateStatus('client-1', 'missing-app', ApplicationStatus.ACCEPTED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyApplications', () => {
    it('should return caregiver applications list', async () => {
      (applicationRepo.find as jest.Mock).mockResolvedValue([mockApplication]);

      const result = await service.getMyApplications('caregiver-1');

      expect(applicationRepo.find).toHaveBeenCalledWith({
        where: { caregiverId: 'caregiver-1' },
        relations: { jobOffer: true },
        order: { appliedAt: 'DESC' },
      });
      expect(result).toEqual([mockApplication]);
    });
  });

  describe('countByJobOffer', () => {
    it('should return count of applications for a job offer', async () => {
      (applicationRepo.count as jest.Mock).mockResolvedValue(3);

      const count = await service.countByJobOffer('offer-1');

      expect(applicationRepo.count).toHaveBeenCalledWith({
        where: { jobOfferId: 'offer-1' },
      });
      expect(count).toBe(3);
    });
  });
});
