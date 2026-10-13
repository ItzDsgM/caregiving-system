import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { FilterModalityReportDto } from './dtos/filter-modality-report.dto';
import { FilterZoneReportDto } from './dtos/filter-zone-report.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getClientModalityReport: jest.fn(),
    getTopZonesReport: jest.fn(),
    getExecutiveSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getClientModalityReport', () => {
    it('should delegate to service.getClientModalityReport with query dto', async () => {
      const dto: FilterModalityReportDto = { city: 'Bogota' };
      const expected = { totalOffers: 10, totalAcceptedServices: 5, categories: [] };
      mockReportsService.getClientModalityReport.mockResolvedValue(expected);

      const result = await controller.getClientModalityReport(dto);

      expect(service.getClientModalityReport).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getTopZonesReport', () => {
    it('should delegate to service.getTopZonesReport with query dto', async () => {
      const dto: FilterZoneReportDto = { limit: 5 };
      const expected = { mostServedZone: null, totalCompletedServices: 0, zones: [] };
      mockReportsService.getTopZonesReport.mockResolvedValue(expected);

      const result = await controller.getTopZonesReport(dto);

      expect(service.getTopZonesReport).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getExecutiveSummary', () => {
    it('should delegate to service.getExecutiveSummary', async () => {
      const expected = {
        totalJobOffers: 20,
        totalHiredServices: 10,
        predominantModality: 'Elderly Care',
        topServedZone: null,
        modalityBreakdown: [],
        topFiveZones: [],
      };
      mockReportsService.getExecutiveSummary.mockResolvedValue(expected);

      const result = await controller.getExecutiveSummary();

      expect(service.getExecutiveSummary).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });
});
