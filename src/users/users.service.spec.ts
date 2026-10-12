import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateUserDto } from './dtos/update-user.dto';

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: jest.Mocked<Partial<Repository<User>>>;

  beforeEach(async () => {
    usersRepository = {
      create: jest.fn().mockImplementation((dto) => dto as User),
      save: jest.fn().mockImplementation(async (user) => user as User),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return the user with relations when found', async () => {
      const mockUser: User = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'Maria',
        lastName: 'Lopez',
        phone: '+1234567890',
        role: UserRole.CAREGIVER,
        isActive: true,
        suspensionReason: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await usersService.findById('user-uuid-1');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        relations: { caregiverProfile: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(usersService.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' } as User;
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await usersService.findByEmail('test@example.com');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user with email is not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await usersService.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user attributes and return the saved entity', async () => {
      const existingUser: User = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        password: 'hash',
        firstName: 'OldName',
        lastName: 'OldLast',
        phone: '111',
        role: UserRole.CLIENT,
        isActive: true,
        suspensionReason: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (usersRepository.findOne as jest.Mock).mockResolvedValue(existingUser);

      const updateDto: UpdateUserDto = {
        firstName: 'NewName',
        phone: '999',
      };

      const result = await usersService.update('user-uuid-1', updateDto);

      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'NewName',
          lastName: 'OldLast',
          phone: '999',
        }),
      );
      expect(result.firstName).toBe('NewName');
      expect(result.phone).toBe('999');
    });
  });

  describe('findByResetToken', () => {
    it('should execute query builder with hidden reset token fields', async () => {
      const mockQueryBuilder: Partial<SelectQueryBuilder<User>> = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'user-uuid-1' } as User),
      };

      (usersRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder as SelectQueryBuilder<User>,
      );

      const result = await usersService.findByResetToken('some-token');

      expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'user.resetPasswordToken',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'user.resetPasswordExpires',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.resetPasswordToken = :token',
        { token: 'some-token' },
      );
      expect(result).toEqual({ id: 'user-uuid-1' });
    });
  });
});
