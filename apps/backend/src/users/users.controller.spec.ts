import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: { findById: jest.Mock; update: jest.Mock };
  const me = { id: 'user-1' } as User;

  beforeEach(() => {
    service = { findById: jest.fn(), update: jest.fn() };
    controller = new UsersController(service as unknown as UsersService);
  });

  it('getProfile should load the authenticated user by id (RF01.5.1)', async () => {
    service.findById.mockResolvedValue({ id: 'user-1', caregiverProfile: {} });

    await expect(controller.getProfile(me)).resolves.toMatchObject({ id: 'user-1' });
    expect(service.findById).toHaveBeenCalledWith('user-1');
  });

  it('updateProfile should only update the authenticated user (RF01.5.2)', async () => {
    service.update.mockResolvedValue({ id: 'user-1', firstName: 'N' });

    await controller.updateProfile(me, { firstName: 'N' });

    expect(service.update).toHaveBeenCalledWith('user-1', { firstName: 'N' });
  });

  it('should be protected by JwtAuthGuard at class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UsersController)).toContain(JwtAuthGuard);
  });
});
