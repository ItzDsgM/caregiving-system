import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminSeedService } from './admin-seed.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_secret_password'),
}));

describe('AdminSeedService', () => {
  let service: AdminSeedService;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto as User),
      save: jest.fn().mockImplementation(async (user) => user as User),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSeedService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<AdminSeedService>(AdminSeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should seed admin user when no admin exists in repository', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.onApplicationBootstrap();

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('AdminSecret123!', 10);
      expect(userRepo.create).toHaveBeenCalledWith({
        email: 'admin@careconnect.com',
        password: 'hashed_secret_password',
        firstName: 'System',
        lastName: 'Admin',
        phone: '+573110000000',
        role: UserRole.ADMIN,
        isActive: true,
      });
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should not seed admin user when an admin already exists', async () => {
      const existingAdmin = {
        id: 'admin-id-1',
        email: 'existing.admin@careconnect.com',
        role: UserRole.ADMIN,
      } as User;
      (userRepo.findOne as jest.Mock).mockResolvedValue(existingAdmin);

      await service.onApplicationBootstrap();

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN },
      });
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });
});
