import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { VerificationStatus } from '../common/enums/verification-status.enum';

describe('AdminController', () => {
  let controller: AdminController;
  let service: Record<'getPendingDocuments' | 'verifyDocument' | 'updateUserStatus', jest.Mock>;

  beforeEach(() => {
    service = {
      getPendingDocuments: jest.fn(),
      verifyDocument: jest.fn(),
      updateUserStatus: jest.fn(),
    };
    controller = new AdminController(service as unknown as AdminService);
  });

  it('getPendingDocuments should delegate', async () => {
    service.getPendingDocuments.mockResolvedValue([{ id: 'd1' }]);
    await expect(controller.getPendingDocuments()).resolves.toEqual([{ id: 'd1' }]);
  });

  it('verifyDocument should pass id and DTO', async () => {
    const dto = { status: VerificationStatus.APPROVED };
    await controller.verifyDocument('doc-1', dto);
    expect(service.verifyDocument).toHaveBeenCalledWith('doc-1', dto);
  });

  it('updateUserStatus should pass id and DTO', async () => {
    const dto = { isActive: false, suspensionReason: 'abuse' };
    await controller.updateUserStatus('u-1', dto);
    expect(service.updateUserStatus).toHaveBeenCalledWith('u-1', dto);
  });

  it('should be ADMIN-only at class level (RF07)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual([UserRole.ADMIN]);
  });
});
