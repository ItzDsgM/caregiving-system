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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Submit verified review and rating for caregiver' })
  @ApiResponse({ status: 201, description: 'Review created and caregiver metrics atomically recalculated' })
  @ApiResponse({ status: 403, description: 'Forbidden if client has no verified prior interaction' })
  @ApiResponse({ status: 409, description: 'Client already submitted review for caregiver' })
  async createReview(
    @CurrentUser() user: User,
    @Param('caregiverId') caregiverId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, caregiverId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List public reviews for a caregiver with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated reviews ordered by date descending' })
  @ApiResponse({ status: 404, description: 'Caregiver not found' })
  async findByCaregiver(
    @Param('caregiverId') caregiverId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.reviewsService.findByCaregiver(caregiverId, paginationDto);
  }
}
