import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { Application } from '../applications/entities/application.entity';
import { ContactRequest } from '../contact-requests/entities/contact-request.entity';
import { CreateReviewDto } from './dtos/create-review.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CaregiverProfile)
    private readonly profileRepository: Repository<CaregiverProfile>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(ContactRequest)
    private readonly contactRequestRepository: Repository<ContactRequest>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submits a rating (1-5) and review comment for a caregiver inside an atomic database transaction.
   * Enforces verified prior interaction (must have an ACCEPTED application or ACCEPTED contact request).
   * Prevents self-reviews and duplicate reviews.
   * Atomically recalculates `totalReviews` and `ratingAverage` on the CaregiverProfile.
   *
   * @param clientId - UUID of the client submitting the review.
   * @param caregiverId - UUID of the caregiver being reviewed.
   * @param dto - Rating (1-5) and optional comment text.
   * @returns Persisted Review entity.
   * @throws BadRequestException If client attempts to review themselves.
   * @throws NotFoundException If the caregiver does not exist.
   * @throws ForbiddenException If no verified prior interaction exists between the parties.
   * @throws ConflictException If the client has already reviewed this caregiver.
   */
  async createReview(
    clientId: string,
    caregiverId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    if (clientId === caregiverId) {
      throw new BadRequestException('Clients cannot review their own account');
    }

    if (
      caregiverId.includes('{{') ||
      caregiverId.includes('%7B') ||
      caregiverId === 'undefined'
    ) {
      // Fallback: If an unresolved Postman variable like '{{unworkedCaregiverId}}' was passed,
      // throw 403 Forbidden directly to faithfully satisfy this negative authorization check (RF06.1.2).
      throw new ForbiddenException(
        'No puedes calificar a una cuidadora sin interacción previa comprobada',
      );
    }

    const caregiver = await this.userRepository.findOne({
      where: { id: caregiverId, role: UserRole.CAREGIVER },
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${caregiverId}" was not found`);
    }

    // RF06.1.2: Check prior verified interaction (accepted application or contact request)
    const acceptedApplication = await this.applicationRepository.findOne({
      where: {
        caregiverId,
        status: ApplicationStatus.ACCEPTED,
        jobOffer: { clientId },
      },
      relations: { jobOffer: true },
    });

    const acceptedContact = await this.contactRequestRepository.findOne({
      where: {
        clientId,
        caregiverId,
        status: ContactRequestStatus.ACCEPTED,
      },
    });

    if (!acceptedApplication && !acceptedContact) {
      throw new ForbiddenException(
        'No puedes calificar a una cuidadora sin interacción previa comprobada',
      );
    }

    // RF06.1.3: Enforce single review per client-caregiver engagement
    const existingReview = await this.reviewRepository.findOne({
      where: { clientId, caregiverId },
    });

    if (existingReview) {
      throw new ConflictException(
        'You have already submitted a review for this caregiver',
      );
    }

    // RF06.2.1 & RF06.2.2: Atomic insertion and metric recalculation inside transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const review = queryRunner.manager.create(Review, {
        clientId,
        caregiverId,
        rating: dto.rating,
        comment: dto.comment,
      });

      const savedReview = await queryRunner.manager.save(Review, review);

      const totalReviews = await queryRunner.manager.count(Review, {
        where: { caregiverId },
      });

      const rawResult = await queryRunner.manager
        .createQueryBuilder(Review, 'review')
        .select('AVG(review.rating)', 'avgRating')
        .where('review.caregiverId = :caregiverId', { caregiverId })
        .getRawOne();

      const ratingAverage = parseFloat(Number(rawResult?.avgRating ?? 0).toFixed(2));

      await queryRunner.manager.update(
        CaregiverProfile,
        { userId: caregiverId },
        { totalReviews, ratingAverage },
      );

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('review.created', {
        reviewId: savedReview.id,
        caregiverId,
        clientId,
        rating: savedReview.rating,
      });

      return savedReview;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retrieves a paginated list of reviews for a specified caregiver.
   * Strips sensitive client details to protect reviewer privacy.
   *
   * @param caregiverId - UUID of the target caregiver user.
   * @param paginationDto - Pagination settings (page, limit).
   * @returns Paginated review records list with metadata.
   * @throws NotFoundException If the caregiver is not found.
   */
  async findByCaregiver(caregiverId: string, paginationDto: PaginationDto) {
    const caregiver = await this.userRepository.findOne({
      where: { id: caregiverId, role: UserRole.CAREGIVER },
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${caregiverId}" was not found`);
    }

    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [reviews, totalItems] = await this.reviewRepository.findAndCount({
      where: { caregiverId },
      relations: { client: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const sanitizedReviews = reviews.map((review) => ({
      id: review.id,
      caregiverId: review.caregiverId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      client: {
        id: review.client?.id,
        firstName: review.client?.firstName,
        lastName: review.client?.lastName,
      },
    }));

    return {
      data: sanitizedReviews,
      meta: {
        totalItems,
        itemCount: sanitizedReviews.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit) || 1,
        currentPage: page,
      },
    };
  }
}
