import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource, QueryRunner } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let mockManager: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockQueryRunner: jest.Mocked<Partial<QueryRunner>>;

  beforeEach(async () => {
    mockManager = {
      create: jest.fn((entityClass, data) => {
        if (entityClass === User) {
          return { id: 'user-uuid-1', ...data } as User;
        }
        if (entityClass === CaregiverProfile) {
          return { id: 'profile-uuid-1', ...data } as CaregiverProfile;
        }
        return data;
      }),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: mockManager as any,
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner as QueryRunner),
    };

    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByResetToken: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockImplementation(async (user) => user),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'caregiver@example.com',
      password: 'Password123',
      firstName: 'Maria',
      lastName: 'Lopez',
      phone: '+1234567890',
      role: UserRole.CAREGIVER,
    };

    it('should register a CAREGIVER and auto-seed a CaregiverProfile within a transaction', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await authService.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          email: registerDto.email,
          role: UserRole.CAREGIVER,
          isActive: true,
        }),
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        CaregiverProfile,
        expect.objectContaining({
          userId: 'user-uuid-1',
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'user-uuid-1');
      expect(result).not.toHaveProperty('password');
    });

    it('should register a CLIENT without creating CaregiverProfile', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const clientDto: RegisterDto = {
        ...registerDto,
        email: 'client@example.com',
        role: UserRole.CLIENT,
      };

      const result = await authService.register(clientDto);

      expect(mockManager.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          role: UserRole.CLIENT,
        }),
      );
      expect(mockManager.create).not.toHaveBeenCalledWith(
        CaregiverProfile,
        expect.anything(),
      );
      expect(result).toHaveProperty('email', 'client@example.com');
    });

    it('should reject registration if email already exists with ConflictException (409)', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: registerDto.email,
      } as User);

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should reject registration if role is ADMIN with BadRequestException (400)', async () => {
      const adminDto: RegisterDto = {
        ...registerDto,
        role: UserRole.ADMIN,
      };

      await expect(authService.register(adminDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback transaction if error occurs during persistence', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockManager.save as jest.Mock).mockRejectedValue(
        new Error('Database write error'),
      );

      await expect(authService.register(registerDto)).rejects.toThrow(
        'Database write error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123',
    };

    it('should successfully authenticate and return token with sanitized user', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const mockUser: User = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        password: hashedPassword,
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

      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login(loginDto);

      expect(result.access_token).toBe('signed-jwt-token');
      expect(result.user).toHaveProperty('id', 'user-uuid-1');
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException (401) generically if user does not exist', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException (401) generically if password does not match', async () => {
      const wrongHash = await bcrypt.hash('OtherPassword456', 10);
      const mockUser = {
        id: 'user-uuid-1',
        email: loginDto.email,
        password: wrongHash,
        isActive: true,
      } as User;

      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException (403) with message if user is suspended/inactive', async () => {
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const inactiveUser = {
        id: 'user-uuid-1',
        email: loginDto.email,
        password: hashedPassword,
        isActive: false,
      } as User;

      (usersService.findByEmail as jest.Mock).mockResolvedValue(inactiveUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Usuario suspendido o inactivo',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate a 15-minute token and persist on user if found', async () => {
      const dto: ForgotPasswordDto = { email: 'found@example.com' };
      const user = {
        id: 'user-uuid-1',
        email: 'found@example.com',
      } as User;

      (usersService.findByEmail as jest.Mock).mockResolvedValue(user);

      const result = await authService.forgotPassword(dto);

      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          resetPasswordToken: expect.any(String),
          resetPasswordExpires: expect.any(Date),
        }),
      );
      expect(result.message).toContain('If the email is registered');
    });

    it('should return 200 OK generic message even if email is not found (anti-enumeration)', async () => {
      const dto: ForgotPasswordDto = { email: 'notfound@example.com' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      const result = await authService.forgotPassword(dto);

      expect(usersService.save).not.toHaveBeenCalled();
      expect(result.message).toContain('If the email is registered');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid non-expired token', async () => {
      const dto: ResetPasswordDto = {
        token: 'valid-token',
        newPassword: 'NewPassword999',
      };
      const user = {
        id: 'user-uuid-1',
        email: 'user@example.com',
        resetPasswordToken: 'valid-token',
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000), // in 10 mins
      } as User;

      (usersService.findByResetToken as jest.Mock).mockResolvedValue(user);

      const result = await authService.resetPassword(dto);

      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }),
      );
      expect(result.message).toBe('Password has been successfully reset.');
    });

    it('should throw BadRequestException if token is expired', async () => {
      const dto: ResetPasswordDto = {
        token: 'expired-token',
        newPassword: 'NewPassword999',
      };
      const expiredUser = {
        id: 'user-uuid-1',
        resetPasswordToken: 'expired-token',
        resetPasswordExpires: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      } as User;

      (usersService.findByResetToken as jest.Mock).mockResolvedValue(expiredUser);

      await expect(authService.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if token is not found', async () => {
      const dto: ResetPasswordDto = {
        token: 'unknown-token',
        newPassword: 'NewPassword999',
      };

      (usersService.findByResetToken as jest.Mock).mockResolvedValue(null);

      await expect(authService.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
