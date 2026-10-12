import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  @OnEvent('application.created', { async: true })
  handleApplicationCreated(payload: {
    applicationId: string;
    offerTitle: string;
    clientEmail: string;
    caregiverName: string;
  }) {
    this.logger.log(
      `[EMAIL NOTIFICATION] To Client (${payload.clientEmail}): New application received from ${payload.caregiverName} for offer "${payload.offerTitle}" (Application ID: ${payload.applicationId})`,
    );
  }

  @OnEvent('application.status_changed', { async: true })
  handleApplicationStatusChanged(payload: {
    applicationId: string;
    offerTitle: string;
    caregiverEmail: string;
    status: string;
    contactInfo?: {
      clientEmail: string;
      clientPhone: string;
      whatsappUrl: string;
    };
  }) {
    this.logger.log(
      `[EMAIL NOTIFICATION] To Caregiver (${payload.caregiverEmail}): Your application for offer "${payload.offerTitle}" was ${payload.status}`,
    );

    if (payload.status === 'ACCEPTED' && payload.contactInfo) {
      this.logger.log(
        `[CONTACT RELEASE] To Caregiver: Client Contact Details unlocked -> Phone: ${payload.contactInfo.clientPhone}, Email: ${payload.contactInfo.clientEmail}, WhatsApp: ${payload.contactInfo.whatsappUrl}`,
      );
    }
  }

  @OnEvent('contact_request.created', { async: true })
  handleContactRequestCreated(payload: {
    requestId: string;
    caregiverEmail: string;
    clientName: string;
  }) {
    this.logger.log(
      `[EMAIL NOTIFICATION] To Caregiver (${payload.caregiverEmail}): You received a new direct contact inquiry from client ${payload.clientName} (Request ID: ${payload.requestId})`,
    );
  }

  @OnEvent('contact_request.responded', { async: true })
  handleContactRequestResponded(payload: {
    requestId: string;
    clientEmail: string;
    status: string;
    contactInfo?: {
      caregiverEmail: string;
      caregiverPhone: string;
      whatsappUrl: string;
    };
  }) {
    this.logger.log(
      `[EMAIL NOTIFICATION] To Client (${payload.clientEmail}): Direct contact request was ${payload.status} by caregiver`,
    );

    if (payload.status === 'ACCEPTED' && payload.contactInfo) {
      this.logger.log(
        `[CONTACT RELEASE] To Client: Caregiver Contact Details unlocked -> Phone: ${payload.contactInfo.caregiverPhone}, Email: ${payload.contactInfo.caregiverEmail}, WhatsApp: ${payload.contactInfo.whatsappUrl}`,
      );
    }
  }
}
