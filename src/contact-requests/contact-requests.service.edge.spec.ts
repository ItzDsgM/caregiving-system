import { ContactRequestsService } from './contact-requests.service';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';

describe('ContactRequestsService - edge cases', () => {
  let service: ContactRequestsService;
  let crRepo: Record<'findOne' | 'create' | 'save' | 'find', jest.Mock>;
  let userRepo: { findOne: jest.Mock };
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    crRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation(async (d) => ({ id: 'req-1', ...d })),
      find: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    emitter = { emit: jest.fn() };
    service = new ContactRequestsService(crRepo as never, userRepo as never, emitter as never);
  });

  it('create should tolerate a missing client record when composing the notification name', async () => {
    userRepo.findOne
      .mockResolvedValueOnce({ id: 'cg', email: 'cg@x.com' }) // caregiver
      .mockResolvedValueOnce(null); // client
    crRepo.findOne.mockResolvedValue(null);

    await service.create('client-1', { caregiverId: 'cg', initialMessage: 'm'.repeat(15) });

    expect(emitter.emit).toHaveBeenCalledWith(
      'contact_request.created',
      expect.objectContaining({ clientName: '' }),
    );
  });

  it('respond ACCEPTED should not crash when phones are missing and should omit nothing else', async () => {
    crRepo.findOne.mockResolvedValue({
      id: 'req-1',
      caregiverId: 'cg',
      status: ContactRequestStatus.PENDING,
      client: { email: 'c@x.com' },
      caregiver: { email: 'cg@x.com' },
    });

    const result = (await service.respond('cg', 'req-1', {
      status: ContactRequestStatus.ACCEPTED,
    })) as { unlockedContactDetails: { client: { whatsappUrl: string }; caregiver: { whatsappUrl: string } } };

    expect(result.unlockedContactDetails.client.whatsappUrl).toBe('https://wa.me/');
    expect(result.unlockedContactDetails.caregiver.whatsappUrl).toBe('https://wa.me/');
  });

  it('respond ACCEPTED should normalise phones for the WhatsApp links', async () => {
    crRepo.findOne.mockResolvedValue({
      id: 'req-1',
      caregiverId: 'cg',
      status: ContactRequestStatus.PENDING,
      client: { phone: '+57 300-111' },
      caregiver: { phone: '(601) 222' },
    });

    const result = (await service.respond('cg', 'req-1', {
      status: ContactRequestStatus.ACCEPTED,
    })) as { unlockedContactDetails: { client: { whatsappUrl: string }; caregiver: { whatsappUrl: string } } };

    expect(result.unlockedContactDetails.client.whatsappUrl).toBe('https://wa.me/57300111');
    expect(result.unlockedContactDetails.caregiver.whatsappUrl).toBe('https://wa.me/601222');
  });

  describe('privacy guard in listings (RF05.1.5)', () => {
    const base = {
      id: 'req-1',
      clientId: 'client-1',
      caregiverId: 'cg',
      initialMessage: 'hello',
      respondedAt: null,
      createdAt: new Date(),
      client: { id: 'client-1', firstName: 'C', lastName: 'M', email: 'client@x.com', phone: '+57 1' },
      caregiver: { id: 'cg', firstName: 'L', lastName: 'V', email: 'cg@x.com', phone: '+57 2' },
    };

    it('should hide contact data from the caregiver inbox while PENDING', async () => {
      crRepo.find.mockResolvedValue([{ ...base, status: ContactRequestStatus.PENDING }]);

      const [item] = await service.getReceived('cg');

      expect(item.participant.email).toBeUndefined();
      expect(item.participant.phone).toBeUndefined();
      expect(item.participant.whatsappUrl).toBeUndefined();
    });

    it('should hide contact data after REJECTED', async () => {
      crRepo.find.mockResolvedValue([{ ...base, status: ContactRequestStatus.REJECTED }]);

      const [item] = await service.getSent('client-1');

      expect(item.participant.email).toBeUndefined();
    });

    it('should reveal the other party contact to the client once ACCEPTED', async () => {
      crRepo.find.mockResolvedValue([{ ...base, status: ContactRequestStatus.ACCEPTED }]);

      const [item] = await service.getSent('client-1');

      expect(item.participant).toMatchObject({
        id: 'cg',
        email: 'cg@x.com',
        phone: '+57 2',
        whatsappUrl: 'https://wa.me/572',
      });
    });

    it('should reveal the client contact to the caregiver via findById once ACCEPTED', async () => {
      crRepo.findOne.mockResolvedValue({ ...base, status: ContactRequestStatus.ACCEPTED });

      const item = await service.findById('cg', 'req-1');

      expect(item.participant).toMatchObject({ id: 'client-1', email: 'client@x.com', whatsappUrl: 'https://wa.me/571' });
    });

    it('should handle an ACCEPTED request whose counterpart has no phone', async () => {
      crRepo.findOne.mockResolvedValue({
        ...base,
        status: ContactRequestStatus.ACCEPTED,
        caregiver: { id: 'cg', firstName: 'L', lastName: 'V', email: 'cg@x.com' },
      });

      const item = await service.findById('client-1', 'req-1');

      expect(item.participant.whatsappUrl).toBe('https://wa.me/');
    });

    it('should not crash when the counterpart relation is missing', async () => {
      crRepo.findOne.mockResolvedValue({
        ...base,
        status: ContactRequestStatus.ACCEPTED,
        client: undefined,
      });

      const item = await service.findById('cg', 'req-1');

      expect(item.participant.id).toBeUndefined();
    });
  });
});
