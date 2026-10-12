import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: { updateStatus: jest.Mock; getMyApplications: jest.Mock };
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    service = { updateStatus: jest.fn(), getMyApplications: jest.fn() };
    controller = new ApplicationsController(service as unknown as ApplicationsService);
  });

  it('updateStatus should pass client id, application id and new status', async () => {
    service.updateStatus.mockResolvedValue({ application: {} });

    await controller.updateStatus(user, 'app-1', { status: ApplicationStatus.ACCEPTED });

    expect(service.updateStatus).toHaveBeenCalledWith('user-1', 'app-1', ApplicationStatus.ACCEPTED);
  });

  it('getMyApplications should scope the query to the caregiver', async () => {
    service.getMyApplications.mockResolvedValue([{ id: 'a' }]);

    await expect(controller.getMyApplications(user)).resolves.toEqual([{ id: 'a' }]);
    expect(service.getMyApplications).toHaveBeenCalledWith('user-1');
  });

  it('should enforce JWT + role guards and RBAC (CLIENT decides, CAREGIVER lists)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ApplicationsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    const roles = (fn: object) => Reflect.getMetadata(ROLES_KEY, fn);
    expect(roles(ApplicationsController.prototype.updateStatus)).toEqual([UserRole.CLIENT]);
    expect(roles(ApplicationsController.prototype.getMyApplications)).toEqual([UserRole.CAREGIVER]);
  });
});
