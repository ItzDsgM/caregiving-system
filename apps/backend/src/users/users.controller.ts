import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves the full profile of the currently authenticated user,
   * including any associated CaregiverProfile.
   *
   * @param currentUser - Injected user entity resolved by JwtAuthGuard from the Bearer token.
   * @returns Current user entity with related profile details.
   */
  @Get('me')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile returned successfully',
    schema: {
      example: {
        id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        email: 'carlos.mendoza@example.com',
        firstName: 'Carlos',
        lastName: 'Mendoza',
        phone: '+573001234567',
        role: 'CAREGIVER',
        isActive: true,
        suspensionReason: null,
        caregiverProfile: {
          id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
          bio: 'Certified nurse assistant with 6 years experience in elderly care.',
          yearsOfExperience: 6,
          specialties: ['ELDERLY_CARE'],
          hourlyRate: 25000,
          dailyRate8h: 120000,
          dailyRate12h: 170000,
          overnightRate: 190000,
          city: 'Bogotá',
          neighborhoods: ['Usaquén', 'Chapinero'],
          maxCoverageRadiusKm: 15,
          ratingAverage: '4.90',
          totalReviews: 12,
          isDocumentVerified: true,
        },
        createdAt: '2026-10-12T20:00:00.000Z',
        updatedAt: '2026-10-12T20:00:00.000Z',
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
        path: '/api/v1/users/me',
      },
    },
  })
  async getProfile(@CurrentUser() currentUser: User): Promise<User> {
    return this.usersService.findById(currentUser.id);
  }

  /**
   * Updates personal profile attributes (e.g. firstName, lastName, phone) for the authenticated user.
   *
   * @param currentUser - Injected user entity resolved from Bearer token.
   * @param updateUserDto - DTO with fields to update.
   * @returns Updated User entity.
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update authenticated user personal profile information' })
  @ApiResponse({
    status: 200,
    description: 'Profile successfully updated',
    schema: {
      example: {
        id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        email: 'carlos.mendoza@example.com',
        firstName: 'Carlos Alberto',
        lastName: 'Mendoza Restrepo',
        phone: '+573009876543',
        role: 'CAREGIVER',
        isActive: true,
        suspensionReason: null,
        createdAt: '2026-10-12T20:00:00.000Z',
        updatedAt: '2026-10-12T20:05:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on supplied fields',
    schema: {
      example: {
        statusCode: 400,
        message: ['phone must be a string'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/users/me',
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
        path: '/api/v1/users/me',
      },
    },
  })
  async updateProfile(
    @CurrentUser() currentUser: User,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(currentUser.id, updateUserDto);
  }
}
