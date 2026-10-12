import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactRequest } from './entities/contact-request.entity';
import { User } from '../users/entities/user.entity';
import { CreateContactRequestDto } from './dtos/create-contact-request.dto';
import { RespondContactRequestDto } from './dtos/respond-contact-request.dto';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ContactRequestsService {
  constructor(
    @InjectRepository(ContactRequest)
    private readonly contactRequestRepository: Repository<ContactRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(clientId: string, dto: CreateContactRequestDto): Promise<ContactRequest> {
    const caregiver = await this.userRepository.findOne({
      where: { id: dto.caregiverId, role: UserRole.CAREGIVER },
    });

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${dto.caregiverId}" was not found`);
    }

    // Check for active inquiry (RF05.1.2)
    const existingActive = await this.contactRequestRepository.findOne({
      where: [
        { clientId, caregiverId: dto.caregiverId, status: ContactRequestStatus.PENDING },
        { clientId, caregiverId: dto.caregiverId, status: ContactRequestStatus.ACCEPTED },
      ],
    });

    if (existingActive) {
      throw new ConflictException(
        'An active or accepted contact request already exists between you and this caregiver',
      );
    }

    const client = await this.userRepository.findOne({ where: { id: clientId } });

    const request = this.contactRequestRepository.create({
      clientId,
      caregiverId: dto.caregiverId,
      initialMessage: dto.initialMessage,
      status: ContactRequestStatus.PENDING,
    });

    const savedRequest = await this.contactRequestRepository.save(request);

    // Event notification (RF05.2)
    this.eventEmitter.emit('contact_request.created', {
      requestId: savedRequest.id,
      caregiverEmail: caregiver.email,
      clientName: `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim(),
    });

    return savedRequest;
  }

  async getReceived(caregiverId: string) {
    const requests = await this.contactRequestRepository.find({
      where: { caregiverId },
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => this.formatRequest(req, 'caregiver'));
  }

  async getSent(clientId: string) {
    const requests = await this.contactRequestRepository.find({
      where: { clientId },
      relations: { caregiver: true },
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => this.formatRequest(req, 'client'));
  }

  async respond(
    caregiverId: string,
    requestId: string,
    dto: RespondContactRequestDto,
  ) {
    const request = await this.contactRequestRepository.findOne({
      where: { id: requestId },
      relations: { client: true, caregiver: true },
    });

    if (!request) {
      throw new NotFoundException(`Contact request with ID "${requestId}" was not found`);
    }

    if (request.caregiverId !== caregiverId) {
      throw new ForbiddenException(
        'You do not have permission to respond to this contact request',
      );
    }

    if (request.status !== ContactRequestStatus.PENDING) {
      throw new BadRequestException('Only PENDING contact requests can be responded to');
    }

    request.status = dto.status;
    request.respondedAt = new Date();

    const updated = await this.contactRequestRepository.save(request);

    if (dto.status === ContactRequestStatus.ACCEPTED) {
      const clientCleanPhone = request.client?.phone
        ? request.client.phone.replace(/[^0-9]/g, '')
        : '';
      const caregiverCleanPhone = request.caregiver?.phone
        ? request.caregiver.phone.replace(/[^0-9]/g, '')
        : '';

      const unlockedContactDetails = {
        client: {
          firstName: request.client?.firstName,
          lastName: request.client?.lastName,
          email: request.client?.email,
          phone: request.client?.phone,
          whatsappUrl: `https://wa.me/${clientCleanPhone}`,
        },
        caregiver: {
          firstName: request.caregiver?.firstName,
          lastName: request.caregiver?.lastName,
          email: request.caregiver?.email,
          phone: request.caregiver?.phone,
          whatsappUrl: `https://wa.me/${caregiverCleanPhone}`,
        },
      };

      this.eventEmitter.emit('contact_request.responded', {
        requestId: updated.id,
        clientEmail: request.client?.email,
        status: dto.status,
        contactInfo: {
          caregiverEmail: request.caregiver?.email,
          caregiverPhone: request.caregiver?.phone,
          whatsappUrl: `https://wa.me/${caregiverCleanPhone}`,
        },
      });

      return {
        contactRequest: updated,
        unlockedContactDetails,
      };
    }

    this.eventEmitter.emit('contact_request.responded', {
      requestId: updated.id,
      clientEmail: request.client?.email,
      status: dto.status,
    });

    return { contactRequest: updated };
  }

  async findById(userId: string, requestId: string) {
    const request = await this.contactRequestRepository.findOne({
      where: { id: requestId },
      relations: { client: true, caregiver: true },
    });

    if (!request) {
      throw new NotFoundException(`Contact request with ID "${requestId}" was not found`);
    }

    if (request.clientId !== userId && request.caregiverId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this contact request',
      );
    }

    const rolePerspective = request.clientId === userId ? 'client' : 'caregiver';
    return this.formatRequest(request, rolePerspective);
  }

  private formatRequest(request: ContactRequest, perspective: 'client' | 'caregiver') {
    const isAccepted = request.status === ContactRequestStatus.ACCEPTED;

    const otherUser = perspective === 'client' ? request.caregiver : request.client;
    const cleanPhone = otherUser?.phone ? otherUser.phone.replace(/[^0-9]/g, '') : '';

    return {
      id: request.id,
      clientId: request.clientId,
      caregiverId: request.caregiverId,
      initialMessage: request.initialMessage,
      status: request.status,
      respondedAt: request.respondedAt,
      createdAt: request.createdAt,
      participant: {
        id: otherUser?.id,
        firstName: otherUser?.firstName,
        lastName: otherUser?.lastName,
        email: isAccepted ? otherUser?.email : undefined,
        phone: isAccepted ? otherUser?.phone : undefined,
        whatsappUrl: isAccepted ? `https://wa.me/${cleanPhone}` : undefined,
      },
    };
  }
}
