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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Post()
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Send a direct contact inquiry to a caregiver' })
  @ApiResponse({ status: 201, description: 'Contact inquiry created with PENDING status' })
  @ApiResponse({ status: 409, description: 'Active inquiry already exists between parties' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateContactRequestDto,
  ) {
    return this.contactRequestsService.create(user.id, dto);
  }

  @Get('received')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Get direct contact inquiries received by current caregiver' })
  @ApiResponse({ status: 200, description: 'Inquiries received list' })
  async getReceived(@CurrentUser() user: User) {
    return this.contactRequestsService.getReceived(user.id);
  }

  @Get('sent')
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: 'Get direct contact inquiries dispatched by client' })
  @ApiResponse({ status: 200, description: 'Inquiries sent list' })
  async getSent(@CurrentUser() user: User) {
    return this.contactRequestsService.getSent(user.id);
  }

  @Patch(':id/respond')
  @Roles(UserRole.CAREGIVER)
  @ApiOperation({ summary: 'Respond to inquiry with ACCEPTED or REJECTED' })
  @ApiResponse({ status: 200, description: 'Inquiry response recorded, contact revealed on ACCEPTED' })
  @ApiResponse({ status: 403, description: 'Forbidden if not the recipient caregiver' })
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RespondContactRequestDto,
  ) {
    return this.contactRequestsService.respond(user.id, id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single contact request details (participants only)' })
  @ApiResponse({ status: 200, description: 'Contact inquiry details' })
  @ApiResponse({ status: 403, description: 'Forbidden for non-participants' })
  async findById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.contactRequestsService.findById(user.id, id);
  }
}
