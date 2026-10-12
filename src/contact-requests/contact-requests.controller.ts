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
import { ContactRequestsService } from './contact-requests.service';
import { CreateContactRequestDto } from './dtos/create-contact-request.dto';
import { RespondContactRequestDto } from './dtos/respond-contact-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@Controller('contact-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class ContactRequestsController {
  constructor(private readonly contactRequestsService: ContactRequestsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateContactRequestDto,
  ) {
    return this.contactRequestsService.create(user.id, dto);
  }

  @Get('received')
  @Roles(UserRole.CAREGIVER)
  async getReceived(@CurrentUser() user: User) {
    return this.contactRequestsService.getReceived(user.id);
  }

  @Get('sent')
  @Roles(UserRole.CLIENT)
  async getSent(@CurrentUser() user: User) {
    return this.contactRequestsService.getSent(user.id);
  }

  @Patch(':id/respond')
  @Roles(UserRole.CAREGIVER)
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RespondContactRequestDto,
  ) {
    return this.contactRequestsService.respond(user.id, id, dto);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.contactRequestsService.findById(user.id, id);
  }
}
