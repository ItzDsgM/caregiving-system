import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ContactRequestsService } from './contact-requests.service';
import { CreateContactRequestDto } from './dtos/create-contact-request.dto';
import { RespondContactRequestDto } from './dtos/respond-contact-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Contact Requests')
@ApiBearerAuth('access-token')
@Controller('contact-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ContactRequestsController {
  constructor(private readonly contactRequestsService: ContactRequestsService) {}

  /**
   * Submits a direct contact request from the authenticated client to a caregiver.
   * Prevents duplicate active inquiries between the same parties.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @param dto - Target caregiver ID and initial message.
   * @returns Newly created ContactRequest entity in PENDING status.
   */
  @Post()
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Send a direct contact inquiry to a caregiver' })
  @ApiResponse({
    status: 201,
    description: 'Contact inquiry created with PENDING status',
    schema: {
      example: {
        id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
        clientId: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        initialMessage:
          'Hello Carlos, we are looking for care support for my mother during weekday afternoons. Are you available for a phone interview?',
        status: 'PENDING',
        createdAt: '2026-10-12T20:00:00.000Z',
        updatedAt: '2026-10-12T20:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input payload or message too short',
    schema: {
      example: {
        statusCode: 400,
        message: ['Initial message must be at least 15 characters long'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests',
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
        path: '/api/v1/contact-requests',
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
        path: '/api/v1/contact-requests',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Active inquiry already exists between parties',
    schema: {
      example: {
        statusCode: 409,
        message: 'An active contact request already exists between you and this caregiver',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests',
      },
    },
  })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateContactRequestDto,
  ) {
    return this.contactRequestsService.create(user.id, dto);
  }

  /**
   * Retrieves all contact requests received by the authenticated caregiver.
   * Client phone and email are masked unless status is ACCEPTED.
   *
   * @param user - Authenticated user entity with CAREGIVER role.
   * @returns List of incoming contact requests with masked/unlocked client data.
   */
  @Get('received')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Get direct contact inquiries received by current caregiver' })
  @ApiResponse({
    status: 200,
    description: 'Inquiries received list',
    schema: {
      example: [
        {
          id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
          initialMessage:
            'Hello Carlos, we are looking for care support for my mother during weekday afternoons.',
          status: 'PENDING',
          createdAt: '2026-10-12T20:00:00.000Z',
          client: {
            id: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
            firstName: 'Diana',
            lastName: 'Gomez',
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
        path: '/api/v1/contact-requests/received',
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
        path: '/api/v1/contact-requests/received',
      },
    },
  })
  async getReceived(@CurrentUser() user: User) {
    return this.contactRequestsService.getReceived(user.id);
  }

  /**
   * Retrieves all contact requests sent by the authenticated client.
   * Caregiver phone and email are masked unless status is ACCEPTED.
   *
   * @param user - Authenticated user entity with CLIENT role.
   * @returns List of outgoing contact requests with masked/unlocked caregiver data.
   */
  @Get('sent')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get direct contact inquiries dispatched by client' })
  @ApiResponse({
    status: 200,
    description: 'Inquiries sent list',
    schema: {
      example: [
        {
          id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
          initialMessage:
            'Hello Carlos, we are looking for care support for my mother during weekday afternoons.',
          status: 'ACCEPTED',
          createdAt: '2026-10-12T20:00:00.000Z',
          caregiver: {
            id: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
            user: {
              firstName: 'Carlos',
              lastName: 'Mendoza',
              phone: '+573001234567',
              email: 'carlos.mendoza@example.com',
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
        path: '/api/v1/contact-requests/sent',
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
        path: '/api/v1/contact-requests/sent',
      },
    },
  })
  async getSent(@CurrentUser() user: User) {
    return this.contactRequestsService.getSent(user.id);
  }

  /**
   * Responds to an incoming contact inquiry (ACCEPTED or REJECTED) by the recipient caregiver.
   * If ACCEPTED, unlocks mutual contact details (email, phone, direct WhatsApp link).
   *
   * @param user - Authenticated user entity with CAREGIVER role.
   * @param id - UUID of the target contact request.
   * @param dto - Response payload (ACCEPTED or REJECTED).
   * @returns Updated request entity with unlocked contact details if accepted.
   */
  @Patch(':id/respond')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Respond to inquiry with ACCEPTED or REJECTED' })
  @ApiParam({
    name: 'id',
    description: 'ContactRequest UUID to respond to',
    example: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiry response recorded, contact revealed on ACCEPTED',
    schema: {
      example: {
        id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
        status: 'ACCEPTED',
        respondedAt: '2026-10-12T20:15:00.000Z',
        unlockedContact: {
          phone: '+573005550002',
          email: 'diana.client@example.com',
          whatsappUrl: 'https://wa.me/573005550002',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid response status',
    schema: {
      example: {
        statusCode: 400,
        message: ['status must be ACCEPTED or REJECTED'],
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0/respond',
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
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0/respond',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden if not the recipient caregiver',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not authorized to respond to this contact inquiry',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0/respond',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contact request not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Contact request not found with id: f1e2d3c4-b5a6-7890-1234-56789abcdef0',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0/respond',
      },
    },
  })
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RespondContactRequestDto,
  ) {
    return this.contactRequestsService.respond(user.id, id, dto);
  }

  /**
   * Retrieves single contact inquiry details for either participating party (client or caregiver).
   *
   * @param user - Authenticated user entity.
   * @param id - UUID of the target contact request.
   * @returns Formatted contact request object with conditionally unlocked contact info.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get single contact request details (participants only)' })
  @ApiParam({
    name: 'id',
    description: 'ContactRequest UUID',
    example: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact inquiry details',
    schema: {
      example: {
        id: 'f1e2d3c4-b5a6-7890-1234-56789abcdef0',
        clientId: '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
        caregiverId: '7b8c1e2d-3f4a-5b6c-7d8e-9f0a1b2c3d4e',
        initialMessage:
          'Hello Carlos, we are looking for care support for my mother during weekday afternoons.',
        status: 'ACCEPTED',
        createdAt: '2026-10-12T20:00:00.000Z',
        respondedAt: '2026-10-12T20:15:00.000Z',
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
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden for non-participants',
    schema: {
      example: {
        statusCode: 403,
        message: 'You are not a participant in this contact inquiry',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contact request not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Contact request not found with id: f1e2d3c4-b5a6-7890-1234-56789abcdef0',
        timestamp: '2026-10-12T20:00:00.000Z',
        path: '/api/v1/contact-requests/f1e2d3c4-b5a6-7890-1234-56789abcdef0',
      },
    },
  })
  async findById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.contactRequestsService.findById(user.id, id);
  }
}
