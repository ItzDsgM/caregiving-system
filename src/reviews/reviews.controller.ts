import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dtos/create-review.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Reviews')
@Controller('caregivers/:caregiverId/reviews')
@UseInterceptors(ClassSerializerInterceptor)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Submits a verified rating and review for a caregiver.
   * Requires authenticated CLIENT role and verified completed prior engagement.
   * Atomically recalculates the caregiver's average rating and total review count.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param caregiverId - UUID of the caregiver being reviewed.
   * @param dto - Rating (1-5) and comment text.
   * @returns Newly created Review entity.
   */
  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Submit verified review and rating for caregiver' })
  @ApiParam({
    name: 'caregiverId',
    description: 'Caregiver profile UUID to review',
    example: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created and caregiver metrics atomically recalculated',
    schema: {
      example: {
        id: '9a8b7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        clientId: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        rating: 5,
        comment:
          'Outstanding caregiver! Highly attentive, respectful, and punctual. My grandmother was in wonderful hands.',
        createdAt: '2026-10-12T20:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid rating or comment payload',
    schema: {
      example: {
        statusCode: 400,
        message: ['Rating cannot exceed 5', 'Review comment must have at least 15 characters'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access token missing or expired',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if client has no verified prior interaction',
    schema: {
      example: {
        statusCode: 403,
        message:
          'Only clients with a completed service with this caregiver can submit a review',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Caregiver profile not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Caregiver not found with id: 7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Client already submitted review for caregiver',
    schema: {
      example: {
        statusCode: 409,
        message: 'You have already reviewed this caregiver',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  async createReview(
    @CurrentUser() user: User,
    @Param('caregiverId') caregiverId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, caregiverId, dto);
  }

  /**
   * Retrieves a paginated list of public reviews for a specified caregiver.
   *
   * @param caregiverId - UUID of the caregiver.
   * @param paginationDto - Query parameters for pagination (page, limit).
   * @returns Paginated list of reviews with reviewer summaries.
   */
  @Get()
  @ApiOperation({ summary: 'List public reviews for a caregiver with pagination' })
  @ApiParam({
    name: 'caregiverId',
    description: 'Caregiver profile UUID',
    example: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated reviews ordered by date descending',
    schema: {
      example: {
        data: [
          {
            id: '9a8b7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4',
            rating: 5,
            comment:
              'Outstanding caregiver! Highly attentive, respectful, and punctual. My grandmother was in wonderful hands.',
            createdAt: '2026-10-12T20:00:00.000Z',
            client: {
              firstName: 'Diana',
              lastName: 'G.',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination query parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['limit must not be greater than 50'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Caregiver not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Caregiver not found with id: 7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/caregivers/7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e/reviews',
      },
    },
  })
  async findByCaregiver(
    @Param('caregiverId') caregiverId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reviewsService.findByCaregiver(caregiverId, paginationDto);
  }
}
