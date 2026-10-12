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

@Controller('job-offers')
@UseInterceptors(ClassSerializerInterceptor)
export class JobOffersController {
  constructor(
    private readonly jobOffersService: JobOffersService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async create(
    @CurrentUser() user: User,
    @Body() createDto: CreateJobOfferDto,
  ) {
    return this.jobOffersService.create(user.id, createDto);
  }

  @Get('my-offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async getMyOffers(@CurrentUser() user: User) {
    return this.jobOffersService.getMyOffers(user.id);
  }

  @Get()
  async findPublicOffers(@Query() filterDto: FilterJobOffersDto) {
    return this.jobOffersService.findPublicOffers(filterDto);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CAREGIVER)
  async apply(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() applyDto: ApplyJobOfferDto,
  ) {
    return this.applicationsService.apply(user.id, id, applyDto);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async getApplications(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.applicationsService.findByJobOffer(user.id, id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.jobOffersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateDto: UpdateJobOfferDto,
  ) {
    return this.jobOffersService.update(user.id, id, updateDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() statusDto: UpdateJobOfferStatusDto,
  ) {
    return this.jobOffersService.updateStatus(user.id, id, statusDto.status);
  }
}
