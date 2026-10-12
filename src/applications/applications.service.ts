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

  async getMyApplications(caregiverId: string) {
    return this.applicationRepository.find({
      where: { caregiverId },
      relations: { jobOffer: true },
      order: { appliedAt: 'DESC' },
    });
  }

  async countByJobOffer(jobOfferId: string): Promise<number> {
    return this.applicationRepository.count({
      where: { jobOfferId },
    });
  }
}
