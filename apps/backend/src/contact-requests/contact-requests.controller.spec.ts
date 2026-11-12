import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ContactRequestsController } from './contact-requests.controller';
import { ContactRequestsService } from './contact-requests.service';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

describe('ContactRequestsController', () => {
  let controller: ContactRequestsController;
  let service: Record<'create' | 'getReceived' | 'getSent' | 'respond' | 'findById', jest.Mock>;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      getReceived: jest.fn(),
      getSent: jest.fn(),
      respond: jest.fn(),
      findById: jest.fn(),
    };
    controller = new ContactRequestsController(service as unknown as ContactRequestsService);
  });

  it('create should send the client id and DTO', async () => {
    const dto = { caregiverId: 'cg', initialMessage: 'hello there caregiver' };
    await controller.create(user, dto);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('getReceived / getSent should scope to the authenticated user', async () => {
    await controller.getReceived(user);
    await controller.getSent(user);
    expect(service.getReceived).toHaveBeenCalledWith('user-1');
    expect(service.getSent).toHaveBeenCalledWith('user-1');
  });

  it('respond should forward caregiver id, request id and DTO', async () => {
    const dto = { status: ContactRequestStatus.ACCEPTED };
    await controller.respond(user, 'req-1', dto);
    expect(service.respond).toHaveBeenCalledWith('user-1', 'req-1', dto);
  });

  it('findById should use the requesting user id for participant checks', async () => {
    service.findById.mockResolvedValue({ id: 'req-1' });
    await expect(controller.findById(user, 'req-1')).resolves.toEqual({ id: 'req-1' });
    expect(service.findById).toHaveBeenCalledWith('user-1', 'req-1');
  });

  it('should enforce guards and per-route roles (RF05.1)', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ContactRequestsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    const roles = (fn: object) => Reflect.getMetadata(ROLES_KEY, fn);
    const p = ContactRequestsController.prototype;
    expect(roles(p.create)).toEqual([UserRole.CLIENT]);
    expect(roles(p.getSent)).toEqual([UserRole.CLIENT]);
    expect(roles(p.getReceived)).toEqual([UserRole.CAREGIVER]);
    expect(roles(p.respond)).toEqual([UserRole.CAREGIVER]);
    expect(roles(p.findById)).toBeUndefined();
  });
});
