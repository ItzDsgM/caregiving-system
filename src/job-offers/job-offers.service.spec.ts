import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JobOffersService } from './job-offers.service';
import { ApplicationsService } from '../applications/applications.service';
import { JobOffer } from './entities/job-offer.entity';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';
import { CareSpecialty } from '../common/enums/care-specialty.enum';
import { CreateJobOfferDto } from './dtos/create-job-offer.dto';
import { UpdateJobOfferDto } from './dtos/update-job-offer.dto';
import { DayOfWeek } from '../common/enums/day-of-week.enum';
import { ShiftType } from '../common/enums/shift-type.enum';

describe('JobOffersService', () => {
  let service: JobOffersService;
  let repository: jest.Mocked<Partial<Repository<JobOffer>>>;
  let mockApplicationsService: { countByJobOffer: jest.Mock };

  const mockJobOffer: JobOffer = {
    id: 'offer-uuid-1',
    clientId: 'client-uuid-1',
    client: {} as any,
    title: 'Care needed for elderly grandmother with dementia',
    description: 'Looking for a kind and certified caregiver to help with daily living activities.',
    careType: CareSpecialty.ELDERLY_CARE,
    locationCity: 'Bogota',
    locationZone: 'Chapinero Alto',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    requiredSchedule: [{ day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] }],
    budgetMin: 20.0,
    budgetMax: 30.0,
    status: JobOfferStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'offer-uuid-1', ...dto } as JobOffer)),
      save: jest.fn().mockImplementation(async (entity) => entity as JobOffer),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockApplicationsService = {
      countByJobOffer: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOffersService,
        {
          provide: getRepositoryToken(JobOffer),
          useValue: repository,
        },
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
      ],
    }).compile();

    service = module.get<JobOffersService>(JobOffersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateJobOfferDto = {
      title: 'Care needed for elderly grandmother with dementia',
      description: 'Looking for a kind and certified caregiver to help with daily living activities.',
      careType: CareSpecialty.ELDERLY_CARE,
      locationCity: 'Bogota',
      locationZone: 'Chapinero Alto',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      requiredSchedule: [{ day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] }],
      budgetMin: 20.0,
      budgetMax: 30.0,
    };

    it('should create a job offer with OPEN status', async () => {
      const result = await service.create('client-uuid-1', createDto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-uuid-1',
          status: JobOfferStatus.OPEN,
          budgetMin: 20.0,
          budgetMax: 30.0,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toBe(JobOfferStatus.OPEN);
    });

    it('should throw BadRequestException if budgetMax is less than budgetMin', async () => {
      const invalidDto: CreateJobOfferDto = {
        ...createDto,
        budgetMin: 50.0,
        budgetMax: 40.0,
      };

      await expect(service.create('client-uuid-1', invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      const invalidDatesDto: CreateJobOfferDto = {
        ...createDto,
        startDate: '2026-11-15',
        endDate: '2026-11-01',
      };

      await expect(
        service.create('client-uuid-1', invalidDatesDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyOffers', () => {
    it('should return client offers with application counts', async () => {
      (repository.find as jest.Mock).mockResolvedValue([mockJobOffer]);

      const result = await service.getMyOffers('client-uuid-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { clientId: 'client-uuid-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('applicationsCount', 0);
    });
  });

  describe('findPublicOffers', () => {
    it('should return paginated open offers with metadata', async () => {
      const mockQueryBuilder: Partial<SelectQueryBuilder<JobOffer>> = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockJobOffer], 1]),
      };

      (repository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder as SelectQueryBuilder<JobOffer>,
      );

      const result = await service.findPublicOffers({
        city: 'Bogota',
        careType: CareSpecialty.ELDERLY_CARE,
        minBudget: 15,
        maxBudget: 35,
        page: 1,
        limit: 10,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'jobOffer.status = :status',
        { status: JobOfferStatus.OPEN },
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });
  });

  describe('findById', () => {
    it('should return the job offer when found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockJobOffer);

      const result = await service.findById('offer-uuid-1');
      expect(result).toEqual(mockJobOffer);
    });

    it('should throw NotFoundException if offer not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update offer when requester is owner and offer is OPEN', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockJobOffer });

      const updateDto: UpdateJobOfferDto = {
        title: 'Updated title with sufficient characters for validation',
        budgetMax: 35.0,
      };

      const result = await service.update('client-uuid-1', 'offer-uuid-1', updateDto);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated title with sufficient characters for validation',
          budgetMax: 35.0,
        }),
      );
      expect(result.budgetMax).toBe(35.0);
    });

    it('should throw ForbiddenException if requester is not the client owner', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockJobOffer);

      await expect(
        service.update('other-client-id', 'offer-uuid-1', { title: 'Different title text here' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if offer status is not OPEN', async () => {
      const closedOffer = {
        ...mockJobOffer,
        status: JobOfferStatus.CLOSED,
      };
      (repository.findOne as jest.Mock).mockResolvedValue(closedOffer);

      await expect(
        service.update('client-uuid-1', 'offer-uuid-1', { title: 'New title text long enough' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update offer status when requester is owner', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockJobOffer });

      const result = await service.updateStatus(
        'client-uuid-1',
        'offer-uuid-1',
        JobOfferStatus.CLOSED,
      );

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: JobOfferStatus.CLOSED }),
      );
      expect(result.status).toBe(JobOfferStatus.CLOSED);
    });

    it('should throw ForbiddenException if requester is not the owner when changing status', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockJobOffer);

      await expect(
        service.updateStatus(
          'other-client-id',
          'offer-uuid-1',
          JobOfferStatus.CANCELLED,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('date rules (RF03.1.2)', () => {
    const isoDay = (offsetDays: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const baseDto = (): CreateJobOfferDto => ({
      title: 'Care needed for elderly grandmother',
      description: 'Looking for a kind and certified caregiver to help daily.',
      careType: CareSpecialty.ELDERLY_CARE,
      locationCity: 'Bogota',
      locationZone: 'Chapinero',
      startDate: isoDay(1),
      endDate: isoDay(10),
      requiredSchedule: [{ day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] }],
      budgetMin: 10,
      budgetMax: 20,
    });

    beforeEach(() => {
      (repository.create as jest.Mock).mockImplementation((d) => d);
      (repository.save as jest.Mock).mockImplementation(async (d) => d);
    });

    it('should reject a startDate in the past', async () => {
      await expect(
        service.create('client-uuid-1', { ...baseDto(), startDate: isoDay(-3), endDate: isoDay(5) }),
      ).rejects.toThrow('startDate must be today or a future date');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should accept a startDate equal to today', async () => {
      await expect(
        service.create('client-uuid-1', { ...baseDto(), startDate: isoDay(0), endDate: isoDay(5) }),
      ).resolves.toBeDefined();
    });

    it('should reject malformed dates', async () => {
      await expect(
        service.create('client-uuid-1', { ...baseDto(), startDate: 'garbage' }),
      ).rejects.toThrow('Invalid date format');
    });

    it('should reject moving startDate to the past on update', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockJobOffer });

      await expect(
        service.update('client-uuid-1', 'offer-uuid-1', { startDate: isoDay(-1), endDate: isoDay(4) }),
      ).rejects.toThrow('startDate must be today or a future date');
    });

    it('should let a client extend endDate even if the original startDate already passed', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockJobOffer,
        startDate: isoDay(-5),
        endDate: isoDay(1),
      });

      await expect(
        service.update('client-uuid-1', 'offer-uuid-1', { endDate: isoDay(20) }),
      ).resolves.toBeDefined();
    });

    it('should reject an update whose endDate is before the existing startDate', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockJobOffer,
        startDate: isoDay(5),
        endDate: isoDay(10),
      });

      await expect(
        service.update('client-uuid-1', 'offer-uuid-1', { endDate: isoDay(2) }),
      ).rejects.toThrow('endDate must be greater than or equal to startDate');
    });

    it('should validate the merged budget range on update', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockJobOffer,
        budgetMin: 30,
        budgetMax: 50,
      });

      await expect(
        service.update('client-uuid-1', 'offer-uuid-1', { budgetMax: 10 }),
      ).rejects.toThrow('budgetMax must be greater than or equal to budgetMin');
    });
  });

  describe('findPublicOffers - filters', () => {
    it('should apply every optional filter plus OPEN-only base condition (RF04.2)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findPublicOffers({
        city: 'Cali',
        careType: CareSpecialty.CHILD_CARE,
        minBudget: 10,
        maxBudget: 90,
        page: 2,
        limit: 5,
      });

      expect(qb.where).toHaveBeenCalledWith('jobOffer.status = :status', {
        status: JobOfferStatus.OPEN,
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(4);
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result.meta).toMatchObject({ totalItems: 0, totalPages: 1, currentPage: 2 });
    });

    it('should use default pagination when none is supplied', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockJobOffer], 1]),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findPublicOffers({});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result.meta.itemCount).toBe(1);
    });
  });
});
