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
  let service: Record<
    'getPendingDocuments' | 'verifyDocument' | 'bulkVerifyDocuments' | 'bulkCreateUsers' | 'updateUserStatus' | 'updateUserRole',
    jest.Mock
  >;

  let seedService: { seedDatabase: jest.Mock };

  beforeEach(() => {
    service = {
      getPendingDocuments: jest.fn(),
      verifyDocument: jest.fn(),
      bulkVerifyDocuments: jest.fn(),
      bulkCreateUsers: jest.fn(),
      updateUserStatus: jest.fn(),
      updateUserRole: jest.fn(),
    };
    seedService = {
      seedDatabase: jest.fn().mockResolvedValue({ message: 'seeded', counts: {} }),
    };
    controller = new AdminController(service as unknown as AdminService, seedService as any);
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

  it('bulkVerifyDocuments should delegate DTO to service', async () => {
    const dto = { items: [{ id: 'doc-1', status: VerificationStatus.APPROVED }] };
    service.bulkVerifyDocuments.mockResolvedValue({ count: 1, results: [] });
    await expect(controller.bulkVerifyDocuments(dto)).resolves.toEqual({ count: 1, results: [] });
    expect(service.bulkVerifyDocuments).toHaveBeenCalledWith(dto);
  });

  it('bulkCreateUsers should delegate DTO to service', async () => {
    const dto = { users: [] };
    service.bulkCreateUsers.mockResolvedValue({ count: 0, users: [] });
    await expect(controller.bulkCreateUsers(dto)).resolves.toEqual({ count: 0, users: [] });
    expect(service.bulkCreateUsers).toHaveBeenCalledWith(dto);
  });

  it('updateUserStatus should pass id and DTO', async () => {
    const dto = { isActive: false, suspensionReason: 'abuse' };
    await controller.updateUserStatus('u-1', dto);
    expect(service.updateUserStatus).toHaveBeenCalledWith('u-1', dto);
  });

  it('updateUserRole should pass id and DTO', async () => {
    const dto = { role: UserRole.CAREGIVER };
    await controller.updateUserRole('u-1', dto);
    expect(service.updateUserRole).toHaveBeenCalledWith('u-1', dto);
  });

  it('seed should delegate to seedService', async () => {
    await expect(controller.seed()).resolves.toEqual({ message: 'seeded', counts: {} });
    expect(seedService.seedDatabase).toHaveBeenCalled();
  });

  it('should be ADMIN-only at class level (RF07)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminController)).toEqual([UserRole.ADMIN]);
  });
});
