import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { HistoryService } from './history.service';
import { Application } from '../applications/entities/application.entity';
import { CareSpecialty } from '../common/enums/care-specialty.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('HistoryService', () => {
  let service: HistoryService;

  let mockAppQb: any;

  beforeEach(async () => {
    mockAppQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: getRepositoryToken(Application),
          useValue: {
            createQueryBuilder: jest.fn(() => mockAppQb),
          },
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClientHistory', () => {
    it('should return client hiring history with sanitized caregiver data and timeframe', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          proposedRate: 45.0,
          jobOffer: {
            id: 'offer-1',
            title: 'Elderly assistance',
            careType: CareSpecialty.ELDERLY_CARE,
            locationCity: 'Bogota',
            locationZone: 'Chapinero',
            startDate: '2026-01-01',
            endDate: '2026-01-15',
            requiredSchedule: [{ day: 'MONDAY', shifts: ['MORNING'] }],
            budgetMax: 50.0,
          },
          caregiver: {
            id: 'caregiver-1',
            firstName: 'Maria',
            lastName: 'Lopez',
            password: 'secret-password-should-not-leak',
            resetPasswordToken: 'token-leak',
            suspensionReason: 'suspended',
            isActive: true,
            caregiverProfile: {
              ratingAverage: 4.85,
              totalReviews: 12,
              specialties: [CareSpecialty.ELDERLY_CARE],
              yearsOfExperience: 5,
              bio: 'Experienced caregiver',
              isDocumentVerified: true,
            },
          },
        },
      ];

      mockAppQb.getMany.mockResolvedValue(mockApplications);

      const result = await service.getClientHistory('client-1', {
        page: 1,
        limit: 10,
        status: 'ALL',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);

      const item = result.data[0];
      expect(item.contractId).toBe('app-1');
      expect(item.jobOfferId).toBe('offer-1');
      expect(item.offerTitle).toBe('Elderly assistance');
      expect(item.careType).toBe(CareSpecialty.ELDERLY_CARE);
      expect(item.location).toEqual({ city: 'Bogota', zone: 'Chapinero' });
      expect(item.agreedRate).toBe(45.0);
      expect(item.timeframe.durationDays).toBe(15);
      expect(item.timeframe.durationFormatted).toBe('15 days');

      // Verify non-sensitive caregiver data
      expect(item.caregiver.firstName).toBe('Maria');
      expect(item.caregiver.lastName).toBe('Lopez');
      expect(item.caregiver.ratingAverage).toBe(4.85);
      expect(item.caregiver.totalReviews).toBe(12);
      expect(item.caregiver.isDocumentVerified).toBe(true);

      // Verify sensitive data is completely omitted
      expect((item.caregiver as any).password).toBeUndefined();
      expect((item.caregiver as any).resetPasswordToken).toBeUndefined();
      expect((item.caregiver as any).suspensionReason).toBeUndefined();
    });

    it('should apply careType and date range filters', async () => {
      mockAppQb.getMany.mockResolvedValue([]);

      await service.getClientHistory('client-1', {
        careType: CareSpecialty.CHILD_CARE,
        startDateFrom: '2026-01-01',
        startDateTo: '2026-06-30',
        status: 'ALL',
      });

      expect(mockAppQb.andWhere).toHaveBeenCalledWith('offer.careType = :careType', {
        careType: CareSpecialty.CHILD_CARE,
      });
      expect(mockAppQb.andWhere).toHaveBeenCalledWith('offer.startDate >= :startDateFrom', {
        startDateFrom: '2026-01-01',
      });
      expect(mockAppQb.andWhere).toHaveBeenCalledWith('offer.startDate <= :startDateTo', {
        startDateTo: '2026-06-30',
      });
    });

    it('should filter items by engagement status', async () => {
      const mockApplications = [
        {
          id: 'app-completed',
          jobOffer: {
            id: 'offer-1',
            title: 'Completed Job',
            careType: CareSpecialty.ELDERLY_CARE,
            startDate: '2020-01-01',
            endDate: '2020-01-10',
          },
          caregiver: { id: 'c1', firstName: 'A', lastName: 'B' },
        },
        {
          id: 'app-scheduled',
          jobOffer: {
            id: 'offer-2',
            title: 'Future Job',
            careType: CareSpecialty.CHILD_CARE,
            startDate: '2030-01-01',
            endDate: '2030-01-10',
          },
          caregiver: { id: 'c2', firstName: 'C', lastName: 'D' },
        },
      ];

      mockAppQb.getMany.mockResolvedValue(mockApplications);

      const resultCompleted = await service.getClientHistory('client-1', {
        status: 'COMPLETED',
      });
      expect(resultCompleted.data).toHaveLength(1);
      expect(resultCompleted.data[0].contractId).toBe('app-completed');

      const resultScheduled = await service.getClientHistory('client-1', {
        status: 'SCHEDULED',
      });
      expect(resultScheduled.data).toHaveLength(1);
      expect(resultScheduled.data[0].contractId).toBe('app-scheduled');
    });
  });

  describe('getCaregiverHistory', () => {
    it('should return caregiver work history with sanitized client data', async () => {
      const mockApplications = [
        {
          id: 'app-1',
          proposedRate: 35.0,
          jobOffer: {
            id: 'offer-1',
            title: 'Child care assistance',
            careType: CareSpecialty.CHILD_CARE,
            locationCity: 'Medellin',
            locationZone: 'Poblado',
            startDate: '2026-02-01',
            endDate: '2026-02-10',
            requiredSchedule: [{ day: 'SATURDAY', shifts: ['MORNING'] }],
            client: {
              id: 'client-1',
              firstName: 'Carlos',
              lastName: 'Ruiz',
              password: 'secret-hash',
              resetPasswordToken: 'reset-token',
            },
          },
        },
      ];

      mockAppQb.getMany.mockResolvedValue(mockApplications);

      const result = await service.getCaregiverHistory('caregiver-1', {
        page: 1,
        limit: 10,
        status: 'ALL',
      });

      expect(result.data).toHaveLength(1);
      const item = result.data[0];
      expect(item.contractId).toBe('app-1');
      expect(item.offerTitle).toBe('Child care assistance');
      expect(item.careType).toBe(CareSpecialty.CHILD_CARE);
      expect(item.client.firstName).toBe('Carlos');
      expect(item.client.lastName).toBe('Ruiz');
      expect(item.client.city).toBe('Medellin');
      expect(item.client.zone).toBe('Poblado');

      // Verify no passwords leak
      expect((item.client as any).password).toBeUndefined();
      expect((item.client as any).resetPasswordToken).toBeUndefined();
    });
  });

  describe('getMyHistory', () => {
    it('should delegate to getClientHistory when role is CLIENT', async () => {
      const spy = jest.spyOn(service, 'getClientHistory').mockResolvedValue({
        data: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
      });

      await service.getMyHistory('user-1', UserRole.CLIENT, {});
      expect(spy).toHaveBeenCalledWith('user-1', {});
    });

    it('should delegate to getCaregiverHistory when role is CAREGIVER', async () => {
      const spy = jest.spyOn(service, 'getCaregiverHistory').mockResolvedValue({
        data: [],
        meta: { totalItems: 0, itemCount: 0, itemsPerPage: 10, totalPages: 1, currentPage: 1 },
      });

      await service.getMyHistory('user-2', UserRole.CAREGIVER, {});
      expect(spy).toHaveBeenCalledWith('user-2', {});
    });

    it('should throw ForbiddenException if role is ADMIN', async () => {
      await expect(service.getMyHistory('admin-1', UserRole.ADMIN, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
