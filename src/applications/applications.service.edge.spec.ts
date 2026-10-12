import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';

describe('ApplicationsService - edge cases', () => {
  let service: ApplicationsService;
  let appRepo: Record<'findOne' | 'create' | 'save' | 'find' | 'count', jest.Mock>;
  let offerRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let emitter: { emit: jest.Mock };

  beforeEach(() => {
    appRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation(async (d) => ({ id: 'app-1', ...d })),
      find: jest.fn(),
      count: jest.fn(),
    };
    offerRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn() };
    emitter = { emit: jest.fn() };
    service = new ApplicationsService(
      appRepo as never,
      offerRepo as never,
      userRepo as never,
      emitter as never,
    );
  });

  describe('apply', () => {
    it('should store proposedRate as null when omitted and tolerate missing related users', async () => {
      offerRepo.findOne.mockResolvedValue({ id: 'o1', title: 'T', status: JobOfferStatus.OPEN });
      appRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.apply('cg-1', 'o1', { coverLetter: 'c'.repeat(20) });

      expect(result.proposedRate).toBeNull();
      expect(emitter.emit).toHaveBeenCalledWith(
        'application.created',
        expect.objectContaining({ clientEmail: undefined, caregiverName: '' }),
      );
    });

    it('should keep a provided proposedRate and build the caregiver full name', async () => {
      offerRepo.findOne.mockResolvedValue({
        id: 'o1',
        title: 'T',
        status: JobOfferStatus.OPEN,
        client: { email: 'client@x.com' },
      });
      appRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue({ firstName: 'Lucia', lastName: 'Vargas' });

      const result = await service.apply('cg-1', 'o1', {
        coverLetter: 'c'.repeat(20),
        proposedRate: 42,
      });

      expect(result.proposedRate).toBe(42);
      expect(emitter.emit).toHaveBeenCalledWith(
        'application.created',
        expect.objectContaining({ clientEmail: 'client@x.com', caregiverName: 'Lucia Vargas' }),
      );
    });
  });

  describe('updateStatus - ACCEPTED with incomplete contact data', () => {
    it('should still return an (empty) WhatsApp link instead of crashing when phones are missing', async () => {
      appRepo.findOne.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
        jobOffer: { clientId: 'client-1', title: 'T', client: { email: 'c@x.com' } },
        caregiver: { email: 'cg@x.com' },
      });

      const result = (await service.updateStatus(
        'client-1',
        'app-1',
        ApplicationStatus.ACCEPTED,
      )) as { unlockedContactDetails: { client: { whatsappUrl: string }; caregiver: { whatsappUrl: string } } };

      expect(result.unlockedContactDetails.client.whatsappUrl).toBe('https://wa.me/');
      expect(result.unlockedContactDetails.caregiver.whatsappUrl).toBe('https://wa.me/');
    });

    it('should strip non-digits from phones when building wa.me links (RF05.1.5)', async () => {
      appRepo.findOne.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
        jobOffer: {
          clientId: 'client-1',
          title: 'T',
          client: { email: 'c@x.com', phone: '+57 (300) 111-2233' },
        },
        caregiver: { email: 'cg@x.com', phone: '+57 301 444 5566' },
      });

      const result = (await service.updateStatus(
        'client-1',
        'app-1',
        ApplicationStatus.ACCEPTED,
      )) as { unlockedContactDetails: { client: { whatsappUrl: string }; caregiver: { whatsappUrl: string } } };

      expect(result.unlockedContactDetails.client.whatsappUrl).toBe('https://wa.me/573001112233');
      expect(result.unlockedContactDetails.caregiver.whatsappUrl).toBe('https://wa.me/573014445566');
    });

    it('should NOT unlock contact details when rejecting', async () => {
      appRepo.findOne.mockResolvedValue({
        id: 'app-1',
        status: ApplicationStatus.PENDING,
        jobOffer: { clientId: 'client-1', title: 'T', client: { phone: '1' } },
        caregiver: { email: 'cg@x.com', phone: '2' },
      });

      const result = await service.updateStatus('client-1', 'app-1', ApplicationStatus.REJECTED);

      expect(result).not.toHaveProperty('unlockedContactDetails');
      expect(emitter.emit).toHaveBeenCalledWith(
        'application.status_changed',
        expect.not.objectContaining({ contactInfo: expect.anything() }),
      );
    });
  });

  describe('findByJobOffer - privacy', () => {
    it('should withhold caregiver email/phone and tolerate a missing caregiver relation', async () => {
      offerRepo.findOne.mockResolvedValue({ id: 'o1', clientId: 'client-1' });
      appRepo.find.mockResolvedValue([
        {
          id: 'a1',
          jobOfferId: 'o1',
          coverLetter: 'x',
          proposedRate: null,
          status: ApplicationStatus.PENDING,
          appliedAt: new Date(),
          caregiver: { id: 'cg', firstName: 'L', lastName: 'V', email: 'secret@x.com', phone: '999' },
        },
        { id: 'a2', jobOfferId: 'o1', status: ApplicationStatus.PENDING, caregiver: undefined },
      ]);

      const result = await service.findByJobOffer('client-1', 'o1');

      expect(JSON.stringify(result)).not.toContain('secret@x.com');
      expect(JSON.stringify(result)).not.toContain('999');
      expect(result[1].caregiver.id).toBeUndefined();
    });
  });
});
