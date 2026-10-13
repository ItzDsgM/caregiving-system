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
import { Application } from './entities/application.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { User } from '../users/entities/user.entity';
import { ApplyJobOfferDto } from './dtos/apply-job-offer.dto';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submits a candidate application to an open job offer on behalf of the caregiver.
   * Prevents multiple applications for the same job offer. Emits `application.created` event.
   *
   * @param caregiverId - UUID of the authenticated caregiver.
   * @param jobOfferId - UUID of the target job offer.
   * @param dto - Cover letter and optional custom proposed rate.
   * @returns Newly created Application entity in PENDING status.
   * @throws NotFoundException If the job offer does not exist.
   * @throws BadRequestException If the job offer is not in OPEN status.
   * @throws ConflictException If the caregiver has already applied to this offer.
   */
  async apply(
    caregiverId: string,
    jobOfferId: string,
    dto: ApplyJobOfferDto,
  ): Promise<Application> {
    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id: jobOfferId },
      relations: { client: true },
    });

    if (!jobOffer) {
      throw new NotFoundException(`Job offer with ID "${jobOfferId}" was not found`);
    }

    if (jobOffer.status !== JobOfferStatus.OPEN) {
      throw new BadRequestException('Applications are only accepted for OPEN job offers');
    }

    const existingApplication = await this.applicationRepository.findOne({
      where: { jobOfferId, caregiverId },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied to this job offer');
    }

    const caregiver = await this.userRepository.findOne({
      where: { id: caregiverId },
    });

    const application = this.applicationRepository.create({
      jobOfferId,
      caregiverId,
      coverLetter: dto.coverLetter,
      proposedRate: dto.proposedRate ?? null,
      status: ApplicationStatus.PENDING,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Decoupled notification dispatch (RF05.2)
    this.eventEmitter.emit('application.created', {
      applicationId: savedApplication.id,
      offerTitle: jobOffer.title,
      clientEmail: jobOffer.client?.email,
      caregiverName: `${caregiver?.firstName ?? ''} ${caregiver?.lastName ?? ''}`.trim(),
    });

    return savedApplication;
  }

  /**
   * Retrieves all candidate applications for a specific job offer.
   * Enforces privacy protection: masks personal phone and email until an application is accepted.
   *
   * @param clientId - UUID of the client requesting the list (must match offer creator).
   * @param jobOfferId - UUID of the job offer.
   * @returns Array of sanitized application records with caregiver summaries.
   * @throws NotFoundException If the job offer does not exist.
   * @throws ForbiddenException If the requesting client does not own the job offer.
   */
  async findByJobOffer(clientId: string, jobOfferId: string) {
    const jobOffer = await this.jobOfferRepository.findOne({
      where: { id: jobOfferId },
    });

    if (!jobOffer) {
      throw new NotFoundException(`Job offer with ID "${jobOfferId}" was not found`);
    }

    if (jobOffer.clientId !== clientId) {
      throw new ForbiddenException(
        'You do not have permission to view applications for this offer',
      );
    }

    const applications = await this.applicationRepository.find({
      where: { jobOfferId },
      relations: { caregiver: true },
      order: { appliedAt: 'DESC' },
    });

    // Sanitize caregiver contact data if not accepted (Privacy Guard)
    return applications.map((app) => ({
      id: app.id,
      jobOfferId: app.jobOfferId,
      coverLetter: app.coverLetter,
      proposedRate: app.proposedRate,
      status: app.status,
      appliedAt: app.appliedAt,
      caregiver: {
        id: app.caregiver?.id,
        firstName: app.caregiver?.firstName,
        lastName: app.caregiver?.lastName,
        // email & phone withheld unless accepted
      },
    }));
  }

  /**
   * Updates an application status (ACCEPTED or REJECTED) by the job offer creator.
   * If ACCEPTED, unlocks mutual contact details (email, phone, direct WhatsApp link) and emits event.
   *
   * @param clientId - UUID of the client owning the job offer.
   * @param applicationId - UUID of the application record.
   * @param status - Target status (ACCEPTED or REJECTED).
   * @returns Updated application entity and unlocked contact details if accepted.
   * @throws NotFoundException If the application does not exist.
   * @throws ForbiddenException If the client does not own the parent job offer.
   */
  async updateStatus(
    clientId: string,
    applicationId: string,
    status: ApplicationStatus,
  ) {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: { jobOffer: { client: true }, caregiver: true },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID "${applicationId}" was not found`,
      );
    }

    if (application.jobOffer.clientId !== clientId) {
      throw new ForbiddenException(
        'You do not have permission to update this application',
      );
    }

    application.status = status;
    const updated = await this.applicationRepository.save(application);

    const client = application.jobOffer.client;
    const caregiver = application.caregiver;

    if (status === ApplicationStatus.ACCEPTED) {
      const clientCleanPhone = client?.phone ? client.phone.replace(/[^0-9]/g, '') : '';
      const caregiverCleanPhone = caregiver?.phone ? caregiver.phone.replace(/[^0-9]/g, '') : '';

      const unlockedContactDetails = {
        client: {
          firstName: client?.firstName,
          lastName: client?.lastName,
          email: client?.email,
          phone: client?.phone,
          whatsappUrl: `https://wa.me/${clientCleanPhone}`,
        },
        caregiver: {
          firstName: caregiver?.firstName,
          lastName: caregiver?.lastName,
          email: caregiver?.email,
          phone: caregiver?.phone,
          whatsappUrl: `https://wa.me/${caregiverCleanPhone}`,
        },
      };

      this.eventEmitter.emit('application.status_changed', {
        applicationId: updated.id,
        offerTitle: application.jobOffer.title,
        caregiverEmail: caregiver?.email,
        status,
        contactInfo: {
          clientEmail: client?.email,
          clientPhone: client?.phone,
          whatsappUrl: `https://wa.me/${clientCleanPhone}`,
        },
      });

      return {
        application: updated,
        unlockedContactDetails,
      };
    }

    this.eventEmitter.emit('application.status_changed', {
      applicationId: updated.id,
      offerTitle: application.jobOffer.title,
      caregiverEmail: caregiver?.email,
      status,
    });

    return { application: updated };
  }

  /**
   * Retrieves all applications submitted by the authenticated caregiver,
   * including parent job offer details.
   *
   * @param caregiverId - UUID of the authenticated caregiver.
   * @returns Array of Application entities with related JobOffer records.
   */
  async getMyApplications(caregiverId: string) {
    return this.applicationRepository.find({
      where: { caregiverId },
      relations: { jobOffer: true },
      order: { appliedAt: 'DESC' },
    });
  }

  /**
   * Counts the number of applications submitted for a particular job offer.
   *
   * @param jobOfferId - UUID of the target job offer.
   * @returns Total count of applications.
   */
  async countByJobOffer(jobOfferId: string): Promise<number> {
    return this.applicationRepository.count({
      where: { jobOfferId },
    });
  }
}
