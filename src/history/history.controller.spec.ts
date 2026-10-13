import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { QueryHistoryDto } from './dtos/query-history.dto';

describe('HistoryController', () => {
  let controller: HistoryController;
  let service: HistoryService;

  const mockHistoryService = {
    getMyHistory: jest.fn(),
    getClientHistory: jest.fn(),
    getCaregiverHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        {
          provide: HistoryService,
          useValue: mockHistoryService,
        },
      ],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
    service = module.get<HistoryService>(HistoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyHistory', () => {
    it('should delegate to service.getMyHistory with user id, role, and query dto', async () => {
      const user = { id: 'u1', role: UserRole.CLIENT } as User;
      const dto: QueryHistoryDto = { status: 'ALL' };
      const expected = { data: [], meta: { totalItems: 0 } };
      mockHistoryService.getMyHistory.mockResolvedValue(expected);

      const result = await controller.getMyHistory(user, dto);

      expect(service.getMyHistory).toHaveBeenCalledWith('u1', UserRole.CLIENT, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getClientHistory', () => {
    it('should delegate to service.getClientHistory with client id and query dto', async () => {
      const user = { id: 'client-1', role: UserRole.CLIENT } as User;
      const dto: QueryHistoryDto = { page: 1, limit: 10 };
      const expected = { data: [], meta: { totalItems: 0 } };
      mockHistoryService.getClientHistory.mockResolvedValue(expected);

      const result = await controller.getClientHistory(user, dto);

      expect(service.getClientHistory).toHaveBeenCalledWith('client-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getCaregiverHistory', () => {
    it('should delegate to service.getCaregiverHistory with caregiver id and query dto', async () => {
      const user = { id: 'caregiver-1', role: UserRole.CAREGIVER } as User;
      const dto: QueryHistoryDto = { page: 1, limit: 10 };
      const expected = { data: [], meta: { totalItems: 0 } };
      mockHistoryService.getCaregiverHistory.mockResolvedValue(expected);

      const result = await controller.getCaregiverHistory(user, dto);

      expect(service.getCaregiverHistory).toHaveBeenCalledWith('caregiver-1', dto);
      expect(result).toEqual(expected);
    });
  });
});
