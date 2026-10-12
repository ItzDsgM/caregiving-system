import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';
import { ApplicationsService } from '../applications/applications.service';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

describe('JobOffersController', () => {
  let controller: JobOffersController;
  let offers: Record<'create' | 'getMyOffers' | 'findPublicOffers' | 'findById' | 'update' | 'updateStatus', jest.Mock>;
  let applications: Record<'apply' | 'findByJobOffer', jest.Mock>;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    offers = {
      create: jest.fn(),
      getMyOffers: jest.fn(),
      findPublicOffers: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
    };
    applications = { apply: jest.fn(), findByJobOffer: jest.fn() };
    controller = new JobOffersController(
      offers as unknown as JobOffersService,
      applications as unknown as ApplicationsService,
    );
  });

  it('create should attach the authenticated client id', async () => {
    const dto = { title: 't' } as never;
    await controller.create(user, dto);
    expect(offers.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('getMyOffers should scope to the client', async () => {
    await controller.getMyOffers(user);
    expect(offers.getMyOffers).toHaveBeenCalledWith('user-1');
  });

  it('findPublicOffers / findById should delegate without user context', async () => {
    const filter = { page: 1, limit: 10 };
    await controller.findPublicOffers(filter);
    await controller.findById('offer-1');
    expect(offers.findPublicOffers).toHaveBeenCalledWith(filter);
    expect(offers.findById).toHaveBeenCalledWith('offer-1');
  });

  it('apply should hand the caregiver id, offer id and DTO to ApplicationsService', async () => {
    const dto = { coverLetter: 'c'.repeat(20) };
    await controller.apply(user, 'offer-1', dto);
    expect(applications.apply).toHaveBeenCalledWith('user-1', 'offer-1', dto);
  });

  it('getApplications should hand the client id and offer id to ApplicationsService', async () => {
    await controller.getApplications(user, 'offer-1');
    expect(applications.findByJobOffer).toHaveBeenCalledWith('user-1', 'offer-1');
  });

  it('update should pass client id, offer id and DTO', async () => {
    await controller.update(user, 'offer-1', { title: 'new title here' });
    expect(offers.update).toHaveBeenCalledWith('user-1', 'offer-1', { title: 'new title here' });
  });

  it('updateStatus should unwrap the status from the DTO', async () => {
    await controller.updateStatus(user, 'offer-1', { status: JobOfferStatus.CLOSED });
    expect(offers.updateStatus).toHaveBeenCalledWith('user-1', 'offer-1', JobOfferStatus.CLOSED);
  });

  it('should keep catalog public and protect mutations with role guards (RF03/RF04)', () => {
    const p = JobOffersController.prototype;
    const roles = (fn: object) => Reflect.getMetadata(ROLES_KEY, fn);
    const guards = (fn: object) => Reflect.getMetadata(GUARDS_METADATA, fn);

    expect(guards(p.findPublicOffers)).toBeUndefined();
    expect(guards(p.findById)).toBeUndefined();

    for (const fn of [p.create, p.getMyOffers, p.getApplications, p.update, p.updateStatus]) {
      expect(guards(fn)).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles(fn)).toEqual([UserRole.CLIENT]);
    }
    expect(guards(p.apply)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles(p.apply)).toEqual([UserRole.CAREGIVER]);
  });
});
