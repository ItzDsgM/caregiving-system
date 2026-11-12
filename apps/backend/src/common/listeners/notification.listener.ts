import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Event listener service handling decoupled asynchronous notification events.
 *
 * Simulates email dispatch and privacy release logging for core business lifecycle events:
 * - Application submissions and status transitions (ACCEPTED/REJECTED).
 * - Direct contact request inquiries and response resolutions.
 *
 * All listeners execute asynchronously (`{ async: true }`) without blocking the originating
 * HTTP request thread or database transaction.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  /**
   * Handles the `application.created` event fired when a caregiver applies to a job offer.
   *
   * Emits a simulated email notification to the job offer's client owner, informing them
   * that a new candidate has applied.
   *
   * @param payload Event payload containing application and candidate metadata:
   *  - `applicationId`: Unique UUID of the created application record.
   *  - `offerTitle`: Title of the targeted job offer.
   *  - `clientEmail`: Recipient email of the client job owner.
   *  - `caregiverName`: Full name of the applicant caregiver.
   */
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

  /**
   * Handles the `application.status_changed` event fired when a client accepts or rejects an application.
   *
   * Notifies the caregiver of the client's decision via simulated email. When the status is `ACCEPTED`,
   * it triggers the privacy disclosure mechanism, logging the unlocked client contact information
   * (phone, email, WhatsApp direct link) accessible to the caregiver.
   *
   * @param payload Event payload containing status decision and optional contact unlock details:
   *  - `applicationId`: UUID of the application whose status transitioned.
   *  - `offerTitle`: Title of the job offer.
   *  - `caregiverEmail`: Email address of the applicant caregiver.
   *  - `status`: New application status (`ACCEPTED` or `REJECTED`).
   *  - `contactInfo`: Optional client direct contact data unlocked exclusively upon acceptance.
   */
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

  /**
   * Handles the `contact_request.created` event fired when a client sends a direct inquiry to a caregiver.
   *
   * Dispatches a simulated email notification to the recipient caregiver alerting them of a pending
   * client inquiry that requires their review and response.
   *
   * @param payload Event payload containing contact request metadata:
   *  - `requestId`: UUID of the initiated contact request.
   *  - `caregiverEmail`: Email address of the target caregiver.
   *  - `clientName`: Full name of the client who initiated the request.
   */
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

  /**
   * Handles the `contact_request.responded` event fired when a caregiver accepts or rejects a direct contact request.
   *
   * Notifies the inquiring client of the caregiver's response. When the status is `ACCEPTED`,
   * it triggers the caregiver privacy disclosure mechanism, logging the unlocked caregiver contact details
   * (phone, email, WhatsApp direct link) accessible to the client.
   *
   * @param payload Event payload containing response resolution and unlocked contact details:
   *  - `requestId`: UUID of the resolved contact request.
   *  - `clientEmail`: Recipient email of the client who initiated the inquiry.
   *  - `status`: New request status (`ACCEPTED` or `REJECTED`).
   *  - `contactInfo`: Optional caregiver direct contact data unlocked exclusively upon acceptance.
   */
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

