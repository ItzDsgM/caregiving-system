import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CaregiversController } from './caregivers.controller';
import { CaregiversService } from './caregivers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DocumentType } from '../common/enums/document-type.enum';
import { User } from '../users/entities/user.entity';

describe('CaregiversController', () => {
  let controller: CaregiversController;
  let service: Record<
    'search' | 'getMyProfile' | 'updateMyProfile' | 'uploadDocument' | 'deleteDocument' | 'getPublicProfile',
    jest.Mock
  >;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    service = {
      search: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      uploadDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getPublicProfile: jest.fn(),
    };
    controller = new CaregiversController(service as unknown as CaregiversService);
  });

  it('search should delegate the filters', async () => {
    const dto = { city: 'bog', page: 1, limit: 10 };
    await controller.search(dto);
    expect(service.search).toHaveBeenCalledWith(dto);
  });

  it('getMyProfile / updateMyProfile should use the authenticated user id', async () => {
    await controller.getMyProfile(user);
    await controller.updateMyProfile(user, { city: 'Cali' });
    expect(service.getMyProfile).toHaveBeenCalledWith('user-1');
    expect(service.updateMyProfile).toHaveBeenCalledWith('user-1', { city: 'Cali' });
  });

  describe('uploadDocument', () => {
    it('should reject requests without a file (RF02.3.2)', async () => {
      await expect(
        controller.uploadDocument(user, undefined as never, { documentType: DocumentType.ID_CARD }),
      ).rejects.toThrow(BadRequestException);
      expect(service.uploadDocument).not.toHaveBeenCalled();
    });

    it('should delegate when a file is present', async () => {
      const file = { filename: 'x.pdf' } as Express.Multer.File;
      const dto = { documentType: DocumentType.ID_CARD };
      service.uploadDocument.mockResolvedValue({ id: 'd1' });

      await expect(controller.uploadDocument(user, file, dto)).resolves.toEqual({ id: 'd1' });
      expect(service.uploadDocument).toHaveBeenCalledWith('user-1', file, dto);
    });
  });

  it('deleteDocument should pass user and document ids', async () => {
    await controller.deleteDocument(user, 'doc-1');
    expect(service.deleteDocument).toHaveBeenCalledWith('user-1', 'doc-1');
  });

  it('getPublicProfile should delegate the id', async () => {
    await controller.getPublicProfile('cg-1');
    expect(service.getPublicProfile).toHaveBeenCalledWith('cg-1');
  });

  it('should expose search and public profile without auth, and restrict /me routes to CAREGIVER', () => {
    const p = CaregiversController.prototype;
    const guards = (fn: object) => Reflect.getMetadata(GUARDS_METADATA, fn);
    const roles = (fn: object) => Reflect.getMetadata(ROLES_KEY, fn);

    expect(guards(p.search)).toBeUndefined();
    expect(guards(p.getPublicProfile)).toBeUndefined();

    for (const fn of [p.getMyProfile, p.updateMyProfile, p.uploadDocument, p.deleteDocument]) {
      expect(guards(fn)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles(fn)).toEqual([UserRole.CAREGIVER]);
    }
  });
});
