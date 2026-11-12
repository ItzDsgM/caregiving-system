import { ReviewsService } from './reviews.service';
import { ApplicationStatus } from '../common/enums/application-status.enum';

describe('ReviewsService - edge cases', () => {
  let service: ReviewsService;
  let reviewRepo: Record<'findOne' | 'findAndCount', jest.Mock>;
  let userRepo: { findOne: jest.Mock };
  let appRepo: { findOne: jest.Mock };
  let crRepo: { findOne: jest.Mock };
  let qr: any;
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    reviewRepo = { findOne: jest.fn().mockResolvedValue(null), findAndCount: jest.fn() };
    userRepo = { findOne: jest.fn() };
    appRepo = { findOne: jest.fn() };
    crRepo = { findOne: jest.fn() };
    emitter = { emit: jest.fn() };
    qr = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn().mockImplementation((_e, d) => d),
        save: jest.fn().mockImplementation(async (_e, d) => ({ id: 'r1', ...d })),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue(null),
        }),
      },
    };
    service = new ReviewsService(
      reviewRepo as never,
      userRepo as never,
      {} as never,
      appRepo as never,
      crRepo as never,
      { createQueryRunner: () => qr } as never,
      emitter as never,
    );
  });

  it('should default ratingAverage to 0 when AVG returns no row', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'cg' });
    appRepo.findOne.mockResolvedValue({ status: ApplicationStatus.ACCEPTED });
    crRepo.findOne.mockResolvedValue(null);

    await service.createReview('client-1', 'cg', { rating: 5, comment: 'c'.repeat(15) });

    expect(qr.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'cg' },
      { totalReviews: 1, ratingAverage: 0 },
    );
  });

  it('should round the average to 2 decimals (RF06.2.2)', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'cg' });
    appRepo.findOne.mockResolvedValue(null);
    crRepo.findOne.mockResolvedValue({ status: 'ACCEPTED' });
    qr.manager.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ avgRating: '4.3333333' }),
    });
    qr.manager.count.mockResolvedValue(3);

    await service.createReview('client-1', 'cg', { rating: 4, comment: 'c'.repeat(15) });

    expect(qr.manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'cg' },
      { totalReviews: 3, ratingAverage: 4.33 },
    );
    expect(qr.commitTransaction).toHaveBeenCalled();
    expect(emitter.emit).toHaveBeenCalledWith('review.created', expect.objectContaining({ caregiverId: 'cg' }));
  });

  it('findByCaregiver should apply default pagination and tolerate a deleted client', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'cg' });
    reviewRepo.findAndCount.mockResolvedValue([
      [{ id: 'r1', caregiverId: 'cg', rating: 5, comment: 'x', createdAt: new Date(), client: undefined }],
      1,
    ]);

    const result = await service.findByCaregiver('cg', {});

    expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10, order: { createdAt: 'DESC' } }),
    );
    expect(result.data[0].client.id).toBeUndefined();
    expect(result.meta).toMatchObject({ currentPage: 1, itemsPerPage: 10, totalPages: 1 });
  });

  it('findByCaregiver should never expose client contact data', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'cg' });
    reviewRepo.findAndCount.mockResolvedValue([
      [{ id: 'r1', rating: 4, comment: 'x', client: { id: 'c', firstName: 'A', lastName: 'B', email: 'secret@x.com', phone: '123' } }],
      1,
    ]);

    const result = await service.findByCaregiver('cg', { page: 1, limit: 10 });

    expect(JSON.stringify(result)).not.toContain('secret@x.com');
    expect(JSON.stringify(result)).not.toContain('123');
  });

  it('findByCaregiver should report 1 page for an empty list', async () => {
    userRepo.findOne.mockResolvedValue({ id: 'cg' });
    reviewRepo.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.findByCaregiver('cg', { page: 1, limit: 10 });

    expect(result.meta.totalPages).toBe(1);
  });
});
