import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportsService } from './reports.service';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { Application } from '../applications/entities/application.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { CareSpecialty } from '../common/enums/care-specialty.enum';

describe('ReportsService', () => {
  let service: ReportsService;
  let caregiverProfileRepo: Repository<CaregiverProfile>;

  let mockOfferQb: any;
  let mockAppQb: any;

  beforeEach(async () => {
    mockOfferQb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    mockAppQb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(JobOffer),
          useValue: {
            createQueryBuilder: jest.fn(() => mockOfferQb),
          },
        },
        {
          provide: getRepositoryToken(Application),
          useValue: {
            createQueryBuilder: jest.fn(() => mockAppQb),
          },
        },
        {
          provide: getRepositoryToken(CaregiverProfile),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    caregiverProfileRepo = module.get<Repository<CaregiverProfile>>(
      getRepositoryToken(CaregiverProfile),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClientModalityReport', () => {
    it('should aggregate demand and fulfillment across modalities correctly', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([
        {
          careType: CareSpecialty.ELDERLY_CARE,
          totalOffers: '10',
          acceptedOffers: '8',
          avgBudgetMin: '30.00',
          avgBudgetMax: '50.00',
        },
        {
          careType: CareSpecialty.CHILD_CARE,
          totalOffers: '5',
          acceptedOffers: '4',
          avgBudgetMin: '25.00',
          avgBudgetMax: '40.00',
        },
        {
          careType: CareSpecialty.COGNITIVE_DISABILITY,
          totalOffers: '3',
          acceptedOffers: '2',
          avgBudgetMin: '35.00',
          avgBudgetMax: '55.00',
        },
        {
          careType: CareSpecialty.PHYSICAL_DISABILITY,
          totalOffers: '2',
          acceptedOffers: '1',
          avgBudgetMin: '40.00',
          avgBudgetMax: '60.00',
        },
      ]);

      (caregiverProfileRepo.find as jest.Mock).mockResolvedValue([
        { id: '1', specialties: [CareSpecialty.ELDERLY_CARE, CareSpecialty.CHILD_CARE] },
        { id: '2', specialties: [CareSpecialty.COGNITIVE_DISABILITY] },
        { id: '3', specialties: [CareSpecialty.PHYSICAL_DISABILITY] },
      ]);

      const result = await service.getClientModalityReport({});

      expect(result.totalOffers).toBe(20);
      expect(result.totalAcceptedServices).toBe(15);
      expect(result.categories).toHaveLength(3);

      const elderly = result.categories.find((c) => c.category === CareSpecialty.ELDERLY_CARE);
      expect(elderly).toBeDefined();
      expect(elderly?.totalOffers).toBe(10);
      expect(elderly?.acceptedOffers).toBe(8);
      expect(elderly?.fulfillmentRate).toBe(80.0);
      expect(elderly?.marketSharePercentage).toBe(50.0);
      expect(elderly?.availableCaregiversCount).toBe(1);

      const disability = result.categories.find((c) => c.category === 'DISABILITY_CARE');
      expect(disability).toBeDefined();
      expect(disability?.totalOffers).toBe(5);
      expect(disability?.acceptedOffers).toBe(3);
      expect(disability?.fulfillmentRate).toBe(60.0);
      expect(disability?.availableCaregiversCount).toBe(2);
      expect(disability?.subcategories).toHaveLength(2);
    });

    it('should apply startDate, endDate, and city query filters', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([]);
      (caregiverProfileRepo.find as jest.Mock).mockResolvedValue([]);

      await service.getClientModalityReport({
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        city: 'Bogota',
      });

      expect(mockOfferQb.andWhere).toHaveBeenCalledWith('offer.createdAt >= :startDate', {
        startDate: '2026-01-01',
      });
      expect(mockOfferQb.andWhere).toHaveBeenCalledWith('offer.createdAt <= :endDate', {
        endDate: '2026-12-31',
      });
      expect(mockOfferQb.andWhere).toHaveBeenCalledWith('offer.locationCity ILIKE :city', {
        city: '%Bogota%',
      });
    });

    it('should return 0 metrics gracefully when no offers exist', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([]);
      (caregiverProfileRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getClientModalityReport({});

      expect(result.totalOffers).toBe(0);
      expect(result.totalAcceptedServices).toBe(0);
      result.categories.forEach((cat) => {
        expect(cat.totalOffers).toBe(0);
        expect(cat.acceptedOffers).toBe(0);
        expect(cat.fulfillmentRate).toBe(0);
        expect(cat.marketSharePercentage).toBe(0);
      });
    });
  });

  describe('getTopZonesReport', () => {
    it('should rank top served zones correctly and identify mostServedZone', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([
        {
          city: 'Bogota',
          zone: 'Chapinero',
          totalOffers: '15',
          completedServices: '12',
        },
        {
          city: 'Bogota',
          zone: 'Suba',
          totalOffers: '10',
          completedServices: '6',
        },
      ]);
      mockAppQb.getCount.mockResolvedValue(18);

      const result = await service.getTopZonesReport({ limit: 10 });

      expect(result.totalCompletedServices).toBe(18);
      expect(result.mostServedZone).toEqual({
        city: 'Bogota',
        zone: 'Chapinero',
        completedServices: 12,
      });
      expect(result.zones).toHaveLength(2);
      expect(result.zones[0].rank).toBe(1);
      expect(result.zones[0].zone).toBe('Chapinero');
      expect(result.zones[0].fulfillmentRate).toBe(80.0);
      expect(result.zones[0].percentageOfTotalServed).toBe(66.67);
      expect(result.zones[1].rank).toBe(2);
    });

    it('should apply filters to zone report', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([]);
      mockAppQb.getCount.mockResolvedValue(0);

      await service.getTopZonesReport({
        city: 'Medellin',
        careType: CareSpecialty.ELDERLY_CARE,
        startDate: '2026-02-01',
        endDate: '2026-03-01',
        limit: 5,
      });

      expect(mockOfferQb.andWhere).toHaveBeenCalledWith('offer.locationCity ILIKE :city', {
        city: '%Medellin%',
      });
      expect(mockOfferQb.andWhere).toHaveBeenCalledWith('offer.careType = :careType', {
        careType: CareSpecialty.ELDERLY_CARE,
      });
      expect(mockOfferQb.limit).toHaveBeenCalledWith(5);
    });

    it('should handle empty zone dataset', async () => {
      mockOfferQb.getRawMany.mockResolvedValue([]);
      mockAppQb.getCount.mockResolvedValue(0);

      const result = await service.getTopZonesReport({});

      expect(result.mostServedZone).toBeNull();
      expect(result.totalCompletedServices).toBe(0);
      expect(result.zones).toEqual([]);
    });
  });

  describe('getExecutiveSummary', () => {
    it('should return executive overview combining modality and top zones', async () => {
      jest.spyOn(service, 'getClientModalityReport').mockResolvedValue({
        totalOffers: 50,
        totalAcceptedServices: 35,
        categories: [
          {
            category: CareSpecialty.ELDERLY_CARE,
            label: 'Elderly Care',
            totalOffers: 30,
            acceptedOffers: 25,
            fulfillmentRate: 83.33,
            averageBudgetMin: 30,
            averageBudgetMax: 50,
            marketSharePercentage: 60.0,
            availableCaregiversCount: 15,
          },
          {
            category: CareSpecialty.CHILD_CARE,
            label: 'Child Care',
            totalOffers: 20,
            acceptedOffers: 10,
            fulfillmentRate: 50.0,
            averageBudgetMin: 25,
            averageBudgetMax: 40,
            marketSharePercentage: 40.0,
            availableCaregiversCount: 10,
          },
        ],
      });

      jest.spyOn(service, 'getTopZonesReport').mockResolvedValue({
        mostServedZone: { city: 'Bogota', zone: 'Chapinero', completedServices: 25 },
        totalCompletedServices: 35,
        zones: [
          {
            rank: 1,
            city: 'Bogota',
            zone: 'Chapinero',
            totalOffers: 30,
            completedServices: 25,
            fulfillmentRate: 83.33,
            percentageOfTotalServed: 71.43,
          },
        ],
      });

      const summary = await service.getExecutiveSummary();

      expect(summary.totalJobOffers).toBe(50);
      expect(summary.totalHiredServices).toBe(35);
      expect(summary.predominantModality).toBe('Elderly Care');
      expect(summary.topServedZone?.zone).toBe('Chapinero');
      expect(summary.topFiveZones).toHaveLength(1);
    });
  });
});
