import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContactRequestsService } from './contact-requests.service';
import { ContactRequest } from './entities/contact-request.entity';
import { User } from '../users/entities/user.entity';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('ContactRequestsService', () => {
  let service: ContactRequestsService;
  let contactRequestRepo: jest.Mocked<Partial<Repository<ContactRequest>>>;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let eventEmitter: jest.Mocked<Partial<EventEmitter2>>;

  const mockClient: User = {
    id: 'client-1',
    email: 'client@example.com',
    phone: '+573001234567',
    firstName: 'Maria',
    lastName: 'Lopez',
    role: UserRole.CLIENT,
  } as User;

  const mockCaregiver: User = {
    id: 'caregiver-1',
    email: 'caregiver@example.com',
    phone: '+573109876543',
    firstName: 'Ana',
    lastName: 'Gomez',
    role: UserRole.CAREGIVER,
  } as User;

  const mockContactRequest: ContactRequest = {
    id: 'req-1',
    clientId: 'client-1',
    client: mockClient,
    caregiverId: 'caregiver-1',
    caregiver: mockCaregiver,
    initialMessage: 'Hello, I would like to inquire about your availability.',
    status: ContactRequestStatus.PENDING,
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ContactRequest;

  beforeEach(async () => {
    contactRequestRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'req-1', ...dto } as ContactRequest)),
      save: jest.fn().mockImplementation(async (entity) => entity as ContactRequest),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactRequestsService,
        {
          provide: getRepositoryToken(ContactRequest),
          useValue: contactRequestRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    service = module.get<ContactRequestsService>(ContactRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create contact request and emit notification event', async () => {
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(mockCaregiver)
        .mockResolvedValueOnce(mockClient);
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.create('client-1', {
        caregiverId: 'caregiver-1',
        initialMessage: 'Hello, I would like to inquire about your availability.',
      });

      expect(contactRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          caregiverId: 'caregiver-1',
          initialMessage: 'Hello, I would like to inquire about your availability.',
          status: ContactRequestStatus.PENDING,
        }),
      );
      expect(contactRequestRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contact_request.created',
        expect.objectContaining({
          requestId: 'req-1',
          caregiverEmail: 'caregiver@example.com',
          clientName: 'Maria Lopez',
        }),
      );
      expect(result.status).toBe(ContactRequestStatus.PENDING);
    });

    it('should throw NotFoundException if caregiver does not exist', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('client-1', {
          caregiverId: 'non-existent',
          initialMessage: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if an active contact request already exists', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockCaregiver);
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(mockContactRequest);

      await expect(
        service.create('client-1', {
          caregiverId: 'caregiver-1',
          initialMessage: 'Hello again',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getReceived', () => {
    it('should return received inquiries for caregiver formatted with masked contact info when pending', async () => {
      (contactRequestRepo.find as jest.Mock).mockResolvedValue([mockContactRequest]);

      const result = await service.getReceived('caregiver-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
      expect(result[0].participant).toEqual({
        id: 'client-1',
        firstName: 'Maria',
        lastName: 'Lopez',
        email: undefined,
        phone: undefined,
        whatsappUrl: undefined,
      });
    });
  });

  describe('getSent', () => {
    it('should return sent inquiries for client formatted', async () => {
      (contactRequestRepo.find as jest.Mock).mockResolvedValue([mockContactRequest]);

      const result = await service.getSent('client-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
      expect(result[0].participant.id).toBe('caregiver-1');
      expect(result[0].participant.email).toBeUndefined();
    });
  });

  describe('respond', () => {
    it('should accept contact request and unlock mutual contact details and WhatsApp URLs', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue({ ...mockContactRequest });

      const result = await service.respond('caregiver-1', 'req-1', {
        status: ContactRequestStatus.ACCEPTED,
      });

      expect(contactRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ContactRequestStatus.ACCEPTED,
        }),
      );
      expect(result).toHaveProperty('unlockedContactDetails');
      expect(result.unlockedContactDetails?.client).toEqual({
        firstName: 'Maria',
        lastName: 'Lopez',
        email: 'client@example.com',
        phone: '+573001234567',
        whatsappUrl: 'https://wa.me/573001234567',
      });
      expect(result.unlockedContactDetails?.caregiver).toEqual({
        firstName: 'Ana',
        lastName: 'Gomez',
        email: 'caregiver@example.com',
        phone: '+573109876543',
        whatsappUrl: 'https://wa.me/573109876543',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contact_request.responded',
        expect.objectContaining({
          requestId: 'req-1',
          status: ContactRequestStatus.ACCEPTED,
          contactInfo: expect.objectContaining({
            caregiverPhone: '+573109876543',
            whatsappUrl: 'https://wa.me/573109876543',
          }),
        }),
      );
    });

    it('should reject contact request and emit response event without contact unlock', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue({ ...mockContactRequest });

      const result = await service.respond('caregiver-1', 'req-1', {
        status: ContactRequestStatus.REJECTED,
      });

      expect(contactRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ContactRequestStatus.REJECTED }),
      );
      expect(result).not.toHaveProperty('unlockedContactDetails');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contact_request.responded',
        expect.objectContaining({
          requestId: 'req-1',
          status: ContactRequestStatus.REJECTED,
        }),
      );
    });

    it('should throw NotFoundException if request not found', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.respond('caregiver-1', 'missing-id', {
          status: ContactRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if responder is not the assigned caregiver', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(mockContactRequest);

      await expect(
        service.respond('other-caregiver', 'req-1', {
          status: ContactRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if request is not PENDING', async () => {
      const alreadyAccepted = {
        ...mockContactRequest,
        status: ContactRequestStatus.ACCEPTED,
      };
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(alreadyAccepted);

      await expect(
        service.respond('caregiver-1', 'req-1', {
          status: ContactRequestStatus.ACCEPTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return inquiry details formatted for participant client', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(mockContactRequest);

      const result = await service.findById('client-1', 'req-1');

      expect(result.id).toBe('req-1');
      expect(result.participant.id).toBe('caregiver-1');
    });

    it('should throw ForbiddenException if user is neither client nor caregiver', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(mockContactRequest);

      await expect(
        service.findById('third-party-user', 'req-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if request not found', async () => {
      (contactRequestRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findById('client-1', 'missing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
