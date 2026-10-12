import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };
  let configService: { get: jest.Mock };

  const payload = { sub: 'user-1', email: 'a@b.c', role: UserRole.CLIENT };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    configService = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    };
    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      usersService as unknown as UsersService,
    );
  });

  it('should read the JWT secret from configuration (RNF04)', () => {
    expect(configService.get).toHaveBeenCalledWith(
      'JWT_SECRET',
      expect.any(String),
    );
  });

  it('should return the user entity for an active account', async () => {
    const user = { id: 'user-1', isActive: true };
    usersService.findById.mockResolvedValue(user);

    await expect(strategy.validate(payload)).resolves.toBe(user);
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('should reject suspended users immediately with 403 (RF07.2.2)', async () => {
    usersService.findById.mockResolvedValue({ id: 'user-1', isActive: false });

    await expect(strategy.validate(payload)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should translate a missing user (NotFound) into 401', async () => {
    usersService.findById.mockRejectedValue(new NotFoundException());

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return 401 when the user lookup returns null', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return 401 for unexpected lookup failures without leaking details', async () => {
    usersService.findById.mockRejectedValue(new Error('db down'));

    await expect(strategy.validate(payload)).rejects.toThrow(
      'Invalid or expired authentication token',
    );
  });
});
