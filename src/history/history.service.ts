import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../applications/entities/application.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { QueryHistoryDto } from './dtos/query-history.dto';
import {
  computeEngagementDuration,
  EngagementDuration,
} from './utils/duration-calculator.util';
import { CareSpecialty } from '../common/enums/care-specialty.enum';

export interface SanitizedCaregiverInfo {
  id: string;
  firstName: string;
  lastName: string;
  ratingAverage: number;
  totalReviews: number;
  specialties: CareSpecialty[];
  yearsOfExperience: number;
  bio: string | null;
  isDocumentVerified: boolean;
}

export interface ClientHistoryItem {
  contractId: string;
  jobOfferId: string;
  offerTitle: string;
  careType: CareSpecialty;
  location: {
    city: string;
    zone: string;
  };
  timeframe: EngagementDuration;
  agreedRate: number | null;
  schedule: Array<{ day: string; shifts: string[] }>;
  caregiver: SanitizedCaregiverInfo;
}

export interface SanitizedClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  zone: string;
}

export interface CaregiverHistoryItem {
  contractId: string;
  jobOfferId: string;
  offerTitle: string;
  careType: CareSpecialty;
  timeframe: EngagementDuration;
  agreedRate: number | null;
  schedule: Array<{ day: string; shifts: string[] }>;
  client: SanitizedClientInfo;
}

export interface PaginatedHistoryResult<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async getClientHistory(
    clientId: string,
    dto: QueryHistoryDto,
  ): Promise<PaginatedHistoryResult<ClientHistoryItem>> {
    const qb = this.applicationRepository
      .createQueryBuilder('app')
      .innerJoinAndSelect('app.jobOffer', 'offer')
      .innerJoinAndSelect('app.caregiver', 'caregiver')
      .leftJoinAndSelect('caregiver.caregiverProfile', 'profile')
      .where('offer.clientId = :clientId', { clientId })
      .andWhere('app.status = :status', { status: ApplicationStatus.ACCEPTED });

    if (dto.careType) {
      qb.andWhere('offer.careType = :careType', { careType: dto.careType });
    }
    if (dto.startDateFrom) {
      qb.andWhere('offer.startDate >= :startDateFrom', {
        startDateFrom: dto.startDateFrom,
      });
    }
    if (dto.startDateTo) {
      qb.andWhere('offer.startDate <= :startDateTo', {
        startDateTo: dto.startDateTo,
      });
    }

    qb.orderBy('offer.startDate', 'DESC').addOrderBy('app.appliedAt', 'DESC');

    const applications = await qb.getMany();

    // Map into ClientHistoryItem with non-sensitive caregiver data
    let items: ClientHistoryItem[] = applications.map((app) => {
      const offer = app.jobOffer;
      const caregiver = app.caregiver;
      const profile = caregiver?.caregiverProfile;

      const timeframe = computeEngagementDuration(offer.startDate, offer.endDate);

      return {
        contractId: app.id,
        jobOfferId: offer.id,
        offerTitle: offer.title,
        careType: offer.careType,
        location: {
          city: offer.locationCity,
          zone: offer.locationZone,
        },
        timeframe,
        agreedRate: app.proposedRate ?? offer.budgetMax ?? null,
        schedule: offer.requiredSchedule ?? [],
        caregiver: {
          id: caregiver.id,
          firstName: caregiver.firstName,
          lastName: caregiver.lastName,
          ratingAverage: profile ? Number(profile.ratingAverage) : 0,
          totalReviews: profile ? profile.totalReviews : 0,
          specialties: profile ? profile.specialties : [],
          yearsOfExperience: profile ? profile.yearsOfExperience : 0,
          bio: profile?.bio ?? null,
          isDocumentVerified: profile ? profile.isDocumentVerified : false,
        },
      };
    });

    // In-memory status filter if requested
    if (dto.status && dto.status !== 'ALL') {
      items = items.filter((item) => item.timeframe.status === dto.status);
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getCaregiverHistory(
    caregiverId: string,
    dto: QueryHistoryDto,
  ): Promise<PaginatedHistoryResult<CaregiverHistoryItem>> {
    const qb = this.applicationRepository
      .createQueryBuilder('app')
      .innerJoinAndSelect('app.jobOffer', 'offer')
      .innerJoinAndSelect('offer.client', 'client')
      .where('app.caregiverId = :caregiverId', { caregiverId })
      .andWhere('app.status = :status', { status: ApplicationStatus.ACCEPTED });

    if (dto.careType) {
      qb.andWhere('offer.careType = :careType', { careType: dto.careType });
    }
    if (dto.startDateFrom) {
      qb.andWhere('offer.startDate >= :startDateFrom', {
        startDateFrom: dto.startDateFrom,
      });
    }
    if (dto.startDateTo) {
      qb.andWhere('offer.startDate <= :startDateTo', {
        startDateTo: dto.startDateTo,
      });
    }

    qb.orderBy('offer.startDate', 'DESC').addOrderBy('app.appliedAt', 'DESC');

    const applications = await qb.getMany();

    // Map into CaregiverHistoryItem with non-sensitive client data
    let items: CaregiverHistoryItem[] = applications.map((app) => {
      const offer = app.jobOffer;
      const client = offer.client;

      const timeframe = computeEngagementDuration(offer.startDate, offer.endDate);

      return {
        contractId: app.id,
        jobOfferId: offer.id,
        offerTitle: offer.title,
        careType: offer.careType,
        timeframe,
        agreedRate: app.proposedRate ?? offer.budgetMax ?? null,
        schedule: offer.requiredSchedule ?? [],
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          city: offer.locationCity,
          zone: offer.locationZone,
        },
      };
    });

    // In-memory status filter if requested
    if (dto.status && dto.status !== 'ALL') {
      items = items.filter((item) => item.timeframe.status === dto.status);
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      meta: {
        totalItems,
        itemCount: paginatedItems.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async getMyHistory(userId: string, role: UserRole, dto: QueryHistoryDto) {
    if (role === UserRole.CLIENT) {
      return this.getClientHistory(userId, dto);
    }
    if (role === UserRole.CAREGIVER) {
      return this.getCaregiverHistory(userId, dto);
    }
    throw new ForbiddenException(
      'History is only accessible for CLIENT or CAREGIVER roles',
    );
  }
}
