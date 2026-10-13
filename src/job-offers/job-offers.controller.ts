import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JobOffersService } from './job-offers.service';
import { CreateJobOfferDto } from './dtos/create-job-offer.dto';
import { BulkCreateJobOffersDto } from './dtos/bulk-create-job-offers.dto';
import { UpdateJobOfferDto } from './dtos/update-job-offer.dto';
import { UpdateJobOfferStatusDto } from './dtos/update-job-offer-status.dto';
import { FilterJobOffersDto } from './dtos/filter-job-offers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

import { ApplicationsService } from '../applications/applications.service';
import { ApplyJobOfferDto } from '../applications/dtos/apply-job-offer.dto';

@ApiTags('Job Offers')
@Controller('job-offers')
@UseInterceptors(ClassSerializerInterceptor)
export class JobOffersController {
  constructor(
    private readonly jobOffersService: JobOffersService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  /**
   * Publishes a new job offer in OPEN status created by the authenticated client.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param createDto - Job offer specifications (title, careType, budgets, schedule, location).
   * @returns Newly created JobOffer entity.
   */
  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Create a new job offer with schedule and budget' })
  @ApiResponse({
    status: 201,
    description: 'Job offer created with OPEN status',
    schema: {
      example: {
        id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        clientId: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        title: 'Weekend daytime caregiver needed for elderly grandfather',
        description:
          'Looking for an experienced and attentive caregiver to assist an 82-year-old gentleman with morning mobility exercises, medication reminders, and companionship.',
        careType: 'ELDERLY_CARE',
        locationCity: 'Bogotá',
        locationZone: 'Chapinero Alto',
        startDate: '2026-11-01T08:00:00.000Z',
        endDate: '2026-11-30T17:00:00.000Z',
        requiredSchedule: [
          {
            day: 'SATURDAY',
            shifts: ['MORNING', 'AFTERNOON'],
          },
        ],
        budgetMin: 800000,
        budgetMax: 1200000,
        status: 'OPEN',
        createdAt: '2026-10-12T20:00:00.000Z',
        updatedAt: '2026-10-12T20:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid schedule or budget values',
    schema: {
      example: {
        statusCode: 400,
        message: ['budgetMax must be greater than or equal to budgetMin'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers',
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
        path: '/api/v1/job-offers',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-client roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers',
      },
    },
  })
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateJobOfferDto,
  ) {
    return this.jobOffersService.create(user.id, createDto);
  }

  /**
   * Creates multiple job offers in bulk within an atomic database transaction.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param bulkDto - Batch payload containing array of job offers.
   * @returns Total count and array of created JobOffer entities.
   */
  @Post('bulk')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Create multiple job offers in a single transaction' })
  @ApiResponse({
    status: 201,
    description: 'Batch job offers created successfully',
    schema: {
      example: {
        count: 1,
        jobOffers: [
          {
            id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            clientId: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
            title: 'Morning assistance for elderly parent in Usaquén',
            description:
              'Requires assistance with mobility and breakfast preparation Monday through Friday.',
            careType: 'ELDERLY_CARE',
            locationCity: 'Bogotá',
            locationZone: 'Usaquén',
            startDate: '2026-11-01T07:00:00.000Z',
            endDate: '2026-11-30T13:00:00.000Z',
            requiredSchedule: [{ day: 'MONDAY', shifts: ['MORNING'] }],
            budgetMin: 700000,
            budgetMax: 1000000,
            status: 'OPEN',
            createdAt: '2026-10-12T20:00:00.000Z',
            updatedAt: '2026-10-12T20:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid offer items or schedule/budget values',
    schema: {
      example: {
        statusCode: 400,
        message: ['budgetMin must be a positive number'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/bulk',
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
        path: '/api/v1/job-offers/bulk',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-client roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/bulk',
      },
    },
  })
  async bulkCreate(
    @CurrentUser() user: User,
    @Body() bulkDto: BulkCreateJobOffersDto,
  ) {
    return this.jobOffersService.bulkCreate(user.id, bulkDto);
  }

  /**
   * Retrieves all job offers published by the authenticated client,
   * including the total count of applications received for each offer.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @returns List of job offers enriched with application counts.
   */
  @Get('my-offers')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get client published offers with applicant counts' })
  @ApiResponse({
    status: 200,
    description: 'Client offers returned',
    schema: {
      example: [
        {
          id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
          title: 'Weekend daytime caregiver needed for elderly grandfather',
          careType: 'ELDERLY_CARE',
          status: 'OPEN',
          applicationsCount: 3,
          createdAt: '2026-10-12T20:00:00.000Z',
        },
      ],
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
        path: '/api/v1/job-offers/my-offers',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-client roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/my-offers',
      },
    },
  })
  async getMyOffers(@CurrentUser() user: User) {
    return this.jobOffersService.getMyOffers(user.id);
  }

  /**
   * Retrieves a paginated catalog of open job offers matching optional filters (city, careType, budget).
   * Accessible publicly by all authenticated or unauthenticated users.
   *
   * @param filterDto - Query parameters for filtering and pagination.
   * @returns Paginated job offers list with metadata.
   */
  @Get()
  @ApiOperation({ summary: 'List public open job offers with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated open job offers catalog',
    schema: {
      example: {
        data: [
          {
            id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
            title: 'Weekend daytime caregiver needed for elderly grandfather',
            description:
              'Looking for an experienced and attentive caregiver to assist an 82-year-old gentleman.',
            careType: 'ELDERLY_CARE',
            locationCity: 'Bogotá',
            locationZone: 'Chapinero Alto',
            budgetMin: 800000,
            budgetMax: 1200000,
            status: 'OPEN',
            createdAt: '2026-10-12T20:00:00.000Z',
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
    description: 'Invalid filter query parameters',
    schema: {
      example: {
        statusCode: 400,
        message: ['minBudget must be a positive number'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers',
      },
    },
  })
  async findPublicOffers(@Query() filterDto: FilterJobOffersDto) {
    return this.jobOffersService.findPublicOffers(filterDto);
  }

  /**
   * Submits an application from the authenticated caregiver to an open job offer.
   * Prevents duplicate applications from the same caregiver.
   *
   * @param user - Authenticated user entity with CAREGIVER role.
   * @param id - UUID of the target job offer.
   * @param applyDto - Application proposal containing cover letter and proposed rate.
   * @returns Newly created Application entity in PENDING status.
   */
  @Post(':id/apply')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Submit an application to a job offer' })
  @ApiParam({
    name: 'id',
    description: 'Target JobOffer UUID to apply for',
    example: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @ApiResponse({
    status: 201,
    description: 'Application submitted with PENDING status',
    schema: {
      example: {
        id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
        jobOfferId: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        coverLetter:
          'Dear client, I have 5 years of specialized experience in elderly care and mobility assistance. CPR certified.',
        proposedRate: 950000,
        status: 'PENDING',
        appliedAt: '2026-10-12T20:10:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Job offer is not open',
    schema: {
      example: {
        statusCode: 400,
        message: 'Job offer is no longer open for applications',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/apply',
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
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/apply',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-caregiver roles',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/apply',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job offer not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job offer not found with id: e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/apply',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Already applied to this offer',
    schema: {
      example: {
        statusCode: 409,
        message: 'You have already applied to this job offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/apply',
      },
    },
  })
  async apply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() applyDto: ApplyJobOfferDto,
  ) {
    return this.applicationsService.apply(user.id, id, applyDto);
  }

  /**
   * Retrieves all candidate applications submitted for a specific job offer.
   * Access is strictly restricted to the client who published the offer.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param id - UUID of the target job offer.
   * @returns List of Application entities with applicant caregiver summaries.
   */
  @Get(':id/applications')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'List candidate applications for a specific job offer' })
  @ApiParam({
    name: 'id',
    description: 'JobOffer UUID',
    example: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @ApiResponse({
    status: 200,
    description: 'List of applicants for offer owner',
    schema: {
      example: [
        {
          id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
          coverLetter:
            'Dear client, I have 5 years of specialized experience in elderly care and mobility assistance.',
          proposedRate: 950000,
          status: 'PENDING',
          appliedAt: '2026-10-12T20:10:00.000Z',
          caregiver: {
            id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
            yearsOfExperience: 5,
            ratingAverage: '4.90',
            user: {
              firstName: 'Carlos',
              lastName: 'Mendoza',
            },
          },
        },
      ],
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
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/applications',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if not the offer creator',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to view applications for this offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/applications',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job offer not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job offer not found with id: e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/applications',
      },
    },
  })
  async getApplications(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.findByJobOffer(user.id, id);
  }

  /**
   * Retrieves detailed specifications and requirements for a single job offer by ID.
   *
   * @param id - UUID of the target job offer.
   * @returns JobOffer entity details.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get job offer details by ID' })
  @ApiParam({
    name: 'id',
    description: 'JobOffer UUID',
    example: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @ApiResponse({
    status: 200,
    description: 'Job offer details',
    schema: {
      example: {
        id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        title: 'Weekend daytime caregiver needed for elderly grandfather',
        description:
          'Looking for an experienced and attentive caregiver to assist an 82-year-old gentleman.',
        careType: 'ELDERLY_CARE',
        locationCity: 'Bogotá',
        locationZone: 'Chapinero Alto',
        startDate: '2026-11-01T08:00:00.000Z',
        endDate: '2026-11-30T17:00:00.000Z',
        requiredSchedule: [{ day: 'SATURDAY', shifts: ['MORNING', 'AFTERNOON'] }],
        budgetMin: 800000,
        budgetMax: 1200000,
        status: 'OPEN',
        client: {
          id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
          firstName: 'Diana',
          lastName: 'Gomez',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job offer not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job offer not found with id: e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      },
    },
  })
  async findById(@Param('id') id: string) {
    return this.jobOffersService.findById(id);
  }

  /**
   * Updates an open job offer owned by the client (schedules, careType, budgets).
   * Rejects modifications if offer is already CLOSED or CANCELLED.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param id - UUID of the target job offer.
   * @param updateDto - Partial updates to apply.
   * @returns Updated JobOffer entity.
   */
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Update job offer parameters (owner only, OPEN status only)' })
  @ApiParam({
    name: 'id',
    description: 'JobOffer UUID to update',
    example: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer updated successfully',
    schema: {
      example: {
        id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        title: 'Updated: Full weekend caregiver needed for elderly grandfather',
        description:
          'Updated schedule requirements: assistance needed on Saturdays and Sundays including light meal prep.',
        careType: 'ELDERLY_CARE',
        locationCity: 'Bogotá',
        locationZone: 'Santa Bárbara',
        startDate: '2026-11-05T08:00:00.000Z',
        endDate: '2026-12-05T17:00:00.000Z',
        budgetMin: 900000,
        budgetMax: 1350000,
        status: 'OPEN',
        updatedAt: '2026-10-12T20:20:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Offer is closed or cancelled',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot update a closed or cancelled job offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
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
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if not offer owner',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to update this job offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job offer not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job offer not found with id: e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
      },
    },
  })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateJobOfferDto,
  ) {
    return this.jobOffersService.update(user.id, id, updateDto);
  }

  /**
   * Transitions a job offer status to CLOSED or CANCELLED.
   * Only the owning client has permission to change the status.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param id - UUID of the target job offer.
   * @param statusDto - DTO specifying the target status (CLOSED or CANCELLED).
   * @returns Updated JobOffer entity.
   */
  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Change offer status to CLOSED or CANCELLED' })
  @ApiParam({
    name: 'id',
    description: 'JobOffer UUID to change status',
    example: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @ApiResponse({
    status: 200,
    description: 'Offer status updated',
    schema: {
      example: {
        id: 'e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        status: 'CLOSED',
        updatedAt: '2026-10-12T20:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
    schema: {
      example: {
        statusCode: 400,
        message: ['Status can only be updated to CLOSED or CANCELLED'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/status',
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
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/status',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if not offer owner',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to update this job offer',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/status',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job offer not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Job offer not found with id: e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/job-offers/e2a1b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c/status',
      },
    },
  })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() statusDto: UpdateJobOfferStatusDto,
  ) {
    return this.jobOffersService.updateStatus(user.id, id, statusDto.status);
  }
}
