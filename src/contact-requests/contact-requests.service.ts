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

  /**
   * Creates a direct contact inquiry sent by a client to a caregiver.
   * Checks for duplicate active/accepted inquiries and emits `contact_request.created` event.
   *
   * @param clientId - UUID of the client initiating contact.
   * @param dto - Target caregiver ID and introductory message.
   * @returns Newly created ContactRequest entity in PENDING status.
   * @throws NotFoundException If the target caregiver does not exist.
   * @throws ConflictException If an active or accepted inquiry already exists between the parties.
   */
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

  /**
   * Retrieves all contact inquiries received by the authenticated caregiver.
   * Contact details of client remain masked unless status is ACCEPTED.
   *
   * @param caregiverId - UUID of the authenticated caregiver.
   * @returns Formatted list of incoming inquiries with masked/unlocked client data.
   */
  async getReceived(caregiverId: string) {
    const requests = await this.contactRequestRepository.find({
      where: { caregiverId },
      relations: { client: true },
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => this.formatRequest(req, 'caregiver'));
  }

  /**
   * Retrieves all contact inquiries sent by the authenticated client.
   * Contact details of caregiver remain masked unless status is ACCEPTED.
   *
   * @param clientId - UUID of the authenticated client.
   * @returns Formatted list of outgoing inquiries with masked/unlocked caregiver data.
   */
  async getSent(clientId: string) {
    const requests = await this.contactRequestRepository.find({
      where: { clientId },
      relations: { caregiver: true },
      order: { createdAt: 'DESC' },
    });

    return requests.map((req) => this.formatRequest(req, 'client'));
  }

  /**
   * Responds to a pending contact request (ACCEPTED or REJECTED) on behalf of the caregiver.
   * If ACCEPTED, unlocks mutual contact details (email, phone, direct WhatsApp link) and emits event.
   *
   * @param caregiverId - UUID of the authenticated caregiver recipient.
   * @param requestId - UUID of the contact request.
   * @param dto - Response status payload (ACCEPTED or REJECTED).
   * @returns Updated request entity and unlocked contact details if accepted.
   * @throws NotFoundException If the contact request does not exist.
   * @throws ForbiddenException If the caregiver is not the recipient.
   * @throws BadRequestException If the request is not in PENDING status.
   */
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

  /**
   * Retrieves a single contact inquiry by ID, validating that the requesting user is either client or caregiver.
   *
   * @param userId - UUID of the requesting authenticated user.
   * @param requestId - UUID of the contact request.
   * @returns Formatted inquiry object with conditionally unlocked contact info.
   * @throws NotFoundException If the request does not exist.
   * @throws ForbiddenException If the requesting user is not a participant.
   */
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

  /**
   * Formats a contact request entity for output, conditionally masking phone/email unless ACCEPTED.
   *
   * @param request - ContactRequest entity with client and caregiver relations.
   * @param perspective - Viewing role perspective ('client' or 'caregiver').
   * @returns Formatted response object with participant summary.
   */
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
