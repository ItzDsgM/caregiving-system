import { Logger } from '@nestjs/common';
import { NotificationListener } from './notification.listener';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let logSpy: jest.SpyInstance;

  const logged = () => logSpy.mock.calls.map((c) => String(c[0]));

  beforeEach(() => {
    listener = new NotificationListener();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('application.created', () => {
    it('should notify the client about the new application', () => {
      listener.handleApplicationCreated({
        applicationId: 'app-1',
        offerTitle: 'Night care for grandma',
        clientEmail: 'client@example.com',
        caregiverName: 'Lucia Vargas',
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [msg] = logged();
      expect(msg).toContain('client@example.com');
      expect(msg).toContain('Lucia Vargas');
      expect(msg).toContain('Night care for grandma');
      expect(msg).toContain('app-1');
    });
  });

  describe('application.status_changed', () => {
    const base = {
      applicationId: 'app-1',
      offerTitle: 'Offer',
      caregiverEmail: 'cg@example.com',
    };

    it('should release contact info only when ACCEPTED with contactInfo', () => {
      listener.handleApplicationStatusChanged({
        ...base,
        status: 'ACCEPTED',
        contactInfo: {
          clientEmail: 'client@example.com',
          clientPhone: '+57 300',
          whatsappUrl: 'https://wa.me/57300',
        },
      });

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logged()[1]).toContain('[CONTACT RELEASE]');
      expect(logged()[1]).toContain('https://wa.me/57300');
    });

    it('should NOT leak contact info when REJECTED (privacy guard)', () => {
      listener.handleApplicationStatusChanged({ ...base, status: 'REJECTED' });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logged().join(' ')).not.toContain('CONTACT RELEASE');
    });

    it('should NOT release contact when ACCEPTED but contactInfo is missing', () => {
      listener.handleApplicationStatusChanged({ ...base, status: 'ACCEPTED' });

      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT release contact when contactInfo is present but status is not ACCEPTED', () => {
      listener.handleApplicationStatusChanged({
        ...base,
        status: 'REJECTED',
        contactInfo: {
          clientEmail: 'a@b.c',
          clientPhone: '1',
          whatsappUrl: 'https://wa.me/1',
        },
      });

      expect(logged().join(' ')).not.toContain('CONTACT RELEASE');
    });
  });

  describe('contact_request.created', () => {
    it('should notify the caregiver of the new inquiry', () => {
      listener.handleContactRequestCreated({
        requestId: 'req-1',
        caregiverEmail: 'cg@example.com',
        clientName: 'Carlos Mendoza',
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logged()[0]).toContain('cg@example.com');
      expect(logged()[0]).toContain('Carlos Mendoza');
      expect(logged()[0]).toContain('req-1');
    });
  });

  describe('contact_request.responded', () => {
    it('should release caregiver contact when ACCEPTED', () => {
      listener.handleContactRequestResponded({
        requestId: 'req-1',
        clientEmail: 'client@example.com',
        status: 'ACCEPTED',
        contactInfo: {
          caregiverEmail: 'cg@example.com',
          caregiverPhone: '300',
          whatsappUrl: 'https://wa.me/300',
        },
      });

      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logged()[1]).toContain('[CONTACT RELEASE]');
      expect(logged()[1]).toContain('cg@example.com');
    });

    it('should only notify (no contact) when REJECTED', () => {
      listener.handleContactRequestResponded({
        requestId: 'req-1',
        clientEmail: 'client@example.com',
        status: 'REJECTED',
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logged()[0]).toContain('REJECTED');
    });

    it('should not release contact when ACCEPTED without contactInfo', () => {
      listener.handleContactRequestResponded({
        requestId: 'req-1',
        clientEmail: 'client@example.com',
        status: 'ACCEPTED',
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
    });
  });
});
