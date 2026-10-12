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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobOffersService } from './job-offers.service';
import { CreateJobOfferDto } from './dtos/create-job-offer.dto';
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

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Create a new job offer with schedule and budget' })
  @ApiResponse({ status: 201, description: 'Job offer created with OPEN status' })
  @ApiResponse({ status: 400, description: 'Invalid schedule or budget values' })
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateJobOfferDto,
  ) {
    return this.jobOffersService.create(user.id, createDto);
  }

  @Get('my-offers')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get client published offers with applicant counts' })
  @ApiResponse({ status: 200, description: 'Client offers returned' })
  async getMyOffers(@CurrentUser() user: User) {
    return this.jobOffersService.getMyOffers(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List public open job offers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated open job offers catalog' })
  async findPublicOffers(@Query() filterDto: FilterJobOffersDto) {
    return this.jobOffersService.findPublicOffers(filterDto);
  }

  @Post(':id/apply')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Submit an application to a job offer' })
  @ApiResponse({ status: 201, description: 'Application submitted with PENDING status' })
  @ApiResponse({ status: 400, description: 'Job offer is not open' })
  @ApiResponse({ status: 409, description: 'Already applied to this offer' })
  async apply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() applyDto: ApplyJobOfferDto,
  ) {
    return this.applicationsService.apply(user.id, id, applyDto);
  }

  @Get(':id/applications')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'List candidate applications for a specific job offer' })
  @ApiResponse({ status: 200, description: 'List of applicants for offer owner' })
  @ApiResponse({ status: 403, description: 'Forbidden if not the offer creator' })
  async getApplications(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.findByJobOffer(user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job offer details by ID' })
  @ApiResponse({ status: 200, description: 'Job offer details' })
  @ApiResponse({ status: 404, description: 'Job offer not found' })
  async findById(@Param('id') id: string) {
    return this.jobOffersService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Update job offer parameters (owner only, OPEN status only)' })
  @ApiResponse({ status: 200, description: 'Offer updated successfully' })
  @ApiResponse({ status: 400, description: 'Offer is closed or cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden if not offer owner' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateJobOfferDto,
  ) {
    return this.jobOffersService.update(user.id, id, updateDto);
  }

  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Change offer status to CLOSED or CANCELLED' })
  @ApiResponse({ status: 200, description: 'Offer status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden if not offer owner' })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() statusDto: UpdateJobOfferStatusDto,
  ) {
    return this.jobOffersService.updateStatus(user.id, id, statusDto.status);
  }
}
