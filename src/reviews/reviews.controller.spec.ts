import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: { createReview: jest.Mock; findByCaregiver: jest.Mock };

  beforeEach(() => {
    service = { createReview: jest.fn(), findByCaregiver: jest.fn() };
    controller = new ReviewsController(service as unknown as ReviewsService);
  });

  it('createReview should pass client id, caregiver id and DTO', async () => {
    const dto = { rating: 5, comment: 'Excellent service overall' };
    service.createReview.mockResolvedValue({ id: 'r1' });

    await expect(
      controller.createReview({ id: 'client-1' } as User, 'cg-1', dto),
    ).resolves.toEqual({ id: 'r1' });
    expect(service.createReview).toHaveBeenCalledWith('client-1', 'cg-1', dto);
  });

  it('findByCaregiver should forward pagination', async () => {
    const page = { page: 2, limit: 5 };
    await controller.findByCaregiver('cg-1', page);
    expect(service.findByCaregiver).toHaveBeenCalledWith('cg-1', page);
  });

  it('should restrict creation to CLIENT with JWT while listing stays public (RF06)', () => {
    const p = ReviewsController.prototype;
    expect(Reflect.getMetadata(GUARDS_METADATA, p.createReview)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, p.createReview)).toEqual([UserRole.CLIENT]);
    expect(Reflect.getMetadata(GUARDS_METADATA, p.findByCaregiver)).toBeUndefined();
  });
});
