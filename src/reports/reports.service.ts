import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { Application } from '../applications/entities/application.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { CareSpecialty } from '../common/enums/care-specialty.enum';
import { FilterModalityReportDto } from './dtos/filter-modality-report.dto';
import { FilterZoneReportDto } from './dtos/filter-zone-report.dto';

export interface ModalityCategoryReport {
  category: string;
  label: string;
  totalOffers: number;
  acceptedOffers: number;
  fulfillmentRate: number;
  averageBudgetMin: number;
  averageBudgetMax: number;
  marketSharePercentage: number;
  availableCaregiversCount: number;
  subcategories?: Array<{
    careType: CareSpecialty;
    totalOffers: number;
    acceptedOffers: number;
  }>;
}

export interface ClientModalityReportResponse {
  totalOffers: number;
  totalAcceptedServices: number;
  categories: ModalityCategoryReport[];
}

export interface ZoneItemReport {
  rank: number;
  city: string;
  zone: string;
  totalOffers: number;
  completedServices: number;
  fulfillmentRate: number;
  percentageOfTotalServed: number;
}

export interface TopZonesReportResponse {
  mostServedZone: {
    city: string;
    zone: string;
    completedServices: number;
  } | null;
  totalCompletedServices: number;
  zones: ZoneItemReport[];
}

export interface ExecutiveSummaryResponse {
  totalJobOffers: number;
  totalHiredServices: number;
  predominantModality: string | null;
  topServedZone: {
    city: string;
    zone: string;
    completedServices: number;
  } | null;
  modalityBreakdown: Array<{
    category: string;
    totalOffers: number;
    sharePercentage: number;
  }>;
  topFiveZones: ZoneItemReport[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(CaregiverProfile)
    private readonly caregiverProfileRepository: Repository<CaregiverProfile>,
  ) {}

  /**
   * Generates analytical report on client service modalities (ELDERLY_CARE, DISABILITY, CHILD_CARE).
   * Aggregates total offers, accepted engagements, fulfillment rates, average budget intervals,
   * market share percentages, and available caregiver candidate supply per category.
   *
   * @param dto - Filters (category, careType, date ranges, city).
   * @returns Detailed modality report response.
   */
  async getClientModalityReport(
    dto: FilterModalityReportDto,
  ): Promise<ClientModalityReportResponse> {
    const qb = this.jobOfferRepository
      .createQueryBuilder('offer')
      .leftJoin(
        Application,
        'app',
        'app.jobOfferId = offer.id AND app.status = :acceptedStatus',
        { acceptedStatus: ApplicationStatus.ACCEPTED },
      )
      .select('offer.careType', 'careType')
      .addSelect('COUNT(DISTINCT offer.id)', 'totalOffers')
      .addSelect('COUNT(DISTINCT app.id)', 'acceptedOffers')
      .addSelect('AVG(offer.budgetMin)', 'avgBudgetMin')
      .addSelect('AVG(offer.budgetMax)', 'avgBudgetMax')
      .groupBy('offer.careType');

    if (dto.startDate) {
      qb.andWhere('offer.createdAt >= :startDate', { startDate: dto.startDate });
    }
    if (dto.endDate) {
      qb.andWhere('offer.createdAt <= :endDate', { endDate: dto.endDate });
    }
    if (dto.city) {
      qb.andWhere('offer.locationCity ILIKE :city', { city: `%${dto.city}%` });
    }

    const rawResults = await qb.getRawMany();

    // Query caregiver counts per specialty
    const caregiverProfiles = await this.caregiverProfileRepository.find({
      select: { id: true, specialties: true },
    });

    const caregiversPerSpecialty: Record<CareSpecialty, number> = {
      [CareSpecialty.CHILD_CARE]: 0,
      [CareSpecialty.ELDERLY_CARE]: 0,
      [CareSpecialty.COGNITIVE_DISABILITY]: 0,
      [CareSpecialty.PHYSICAL_DISABILITY]: 0,
    };

    caregiverProfiles.forEach((profile) => {
      if (Array.isArray(profile.specialties)) {
        profile.specialties.forEach((spec) => {
          if (caregiversPerSpecialty[spec] !== undefined) {
            caregiversPerSpecialty[spec]++;
          }
        });
      }
    });

    const parsedStats: Record<
      string,
      {
        totalOffers: number;
        acceptedOffers: number;
        avgBudgetMin: number;
        avgBudgetMax: number;
      }
    > = {};

    let totalPlatformOffers = 0;
    let totalPlatformAccepted = 0;

    for (const row of rawResults) {
      const careType = row.careType as CareSpecialty;
      const offers = parseInt(row.totalOffers, 10) || 0;
      const accepted = parseInt(row.acceptedOffers, 10) || 0;
      const bMin = parseFloat(row.avgBudgetMin) || 0;
      const bMax = parseFloat(row.avgBudgetMax) || 0;

      parsedStats[careType] = {
        totalOffers: offers,
        acceptedOffers: accepted,
        avgBudgetMin: bMin,
        avgBudgetMax: bMax,
      };

      totalPlatformOffers += offers;
      totalPlatformAccepted += accepted;
    }

    // Build categories
    const elderlyStats = parsedStats[CareSpecialty.ELDERLY_CARE] || {
      totalOffers: 0,
      acceptedOffers: 0,
      avgBudgetMin: 0,
      avgBudgetMax: 0,
    };
    const childStats = parsedStats[CareSpecialty.CHILD_CARE] || {
      totalOffers: 0,
      acceptedOffers: 0,
      avgBudgetMin: 0,
      avgBudgetMax: 0,
    };
    const cogStats = parsedStats[CareSpecialty.COGNITIVE_DISABILITY] || {
      totalOffers: 0,
      acceptedOffers: 0,
      avgBudgetMin: 0,
      avgBudgetMax: 0,
    };
    const physStats = parsedStats[CareSpecialty.PHYSICAL_DISABILITY] || {
      totalOffers: 0,
      acceptedOffers: 0,
      avgBudgetMin: 0,
      avgBudgetMax: 0,
    };

    const disTotalOffers = cogStats.totalOffers + physStats.totalOffers;
    const disAccepted = cogStats.acceptedOffers + physStats.acceptedOffers;
    const disAvgMin =
      disTotalOffers > 0
        ? (cogStats.avgBudgetMin * cogStats.totalOffers +
            physStats.avgBudgetMin * physStats.totalOffers) /
          disTotalOffers
        : 0;
    const disAvgMax =
      disTotalOffers > 0
        ? (cogStats.avgBudgetMax * cogStats.totalOffers +
            physStats.avgBudgetMax * physStats.totalOffers) /
          disTotalOffers
        : 0;

    const calcRate = (accepted: number, total: number) =>
      total > 0 ? parseFloat(((accepted / total) * 100).toFixed(2)) : 0;

    const calcShare = (offers: number) =>
      totalPlatformOffers > 0
        ? parseFloat(((offers / totalPlatformOffers) * 100).toFixed(2))
        : 0;

    // Unique caregivers for disability (having either cognitive or physical)
    const disabilityCaregiversCount = caregiverProfiles.filter(
      (p) =>
        Array.isArray(p.specialties) &&
        (p.specialties.includes(CareSpecialty.COGNITIVE_DISABILITY) ||
          p.specialties.includes(CareSpecialty.PHYSICAL_DISABILITY)),
    ).length;

    const categories: ModalityCategoryReport[] = [
      {
        category: CareSpecialty.ELDERLY_CARE,
        label: 'Elderly Care',
        totalOffers: elderlyStats.totalOffers,
        acceptedOffers: elderlyStats.acceptedOffers,
        fulfillmentRate: calcRate(elderlyStats.acceptedOffers, elderlyStats.totalOffers),
        averageBudgetMin: parseFloat(elderlyStats.avgBudgetMin.toFixed(2)),
        averageBudgetMax: parseFloat(elderlyStats.avgBudgetMax.toFixed(2)),
        marketSharePercentage: calcShare(elderlyStats.totalOffers),
        availableCaregiversCount: caregiversPerSpecialty[CareSpecialty.ELDERLY_CARE] || 0,
      },
      {
        category: CareSpecialty.CHILD_CARE,
        label: 'Child Care',
        totalOffers: childStats.totalOffers,
        acceptedOffers: childStats.acceptedOffers,
        fulfillmentRate: calcRate(childStats.acceptedOffers, childStats.totalOffers),
        averageBudgetMin: parseFloat(childStats.avgBudgetMin.toFixed(2)),
        averageBudgetMax: parseFloat(childStats.avgBudgetMax.toFixed(2)),
        marketSharePercentage: calcShare(childStats.totalOffers),
        availableCaregiversCount: caregiversPerSpecialty[CareSpecialty.CHILD_CARE] || 0,
      },
      {
        category: 'DISABILITY_CARE',
        label: 'Disability Support (Cognitive & Physical)',
        totalOffers: disTotalOffers,
        acceptedOffers: disAccepted,
        fulfillmentRate: calcRate(disAccepted, disTotalOffers),
        averageBudgetMin: parseFloat(disAvgMin.toFixed(2)),
        averageBudgetMax: parseFloat(disAvgMax.toFixed(2)),
        marketSharePercentage: calcShare(disTotalOffers),
        availableCaregiversCount: disabilityCaregiversCount,
        subcategories: [
          {
            careType: CareSpecialty.COGNITIVE_DISABILITY,
            totalOffers: cogStats.totalOffers,
            acceptedOffers: cogStats.acceptedOffers,
          },
          {
            careType: CareSpecialty.PHYSICAL_DISABILITY,
            totalOffers: physStats.totalOffers,
            acceptedOffers: physStats.acceptedOffers,
          },
        ],
      },
    ];

    return {
      totalOffers: totalPlatformOffers,
      totalAcceptedServices: totalPlatformAccepted,
      categories,
    };
  }

  /**
   * Generates geographic zone report ranking zones by completed services volume and fulfillment rate.
   * Highlights the top-served zone and computes share of total platform demand per zone.
   *
   * @param dto - Filters (limit, city, careType, date ranges).
   * @returns Top zones analytical report response.
   */
  async getTopZonesReport(dto: FilterZoneReportDto): Promise<TopZonesReportResponse> {
    const qb = this.jobOfferRepository
      .createQueryBuilder('offer')
      .leftJoin(
        Application,
        'app',
        'app.jobOfferId = offer.id AND app.status = :acceptedStatus',
        { acceptedStatus: ApplicationStatus.ACCEPTED },
      )
      .select('offer.locationCity', 'city')
      .addSelect('offer.locationZone', 'zone')
      .addSelect('COUNT(DISTINCT offer.id)', 'totalOffers')
      .addSelect('COUNT(DISTINCT app.id)', 'completedServices')
      .groupBy('offer.locationCity')
      .addGroupBy('offer.locationZone')
      .orderBy('COUNT(DISTINCT app.id)', 'DESC')
      .addOrderBy('COUNT(DISTINCT offer.id)', 'DESC');

    if (dto.city) {
      qb.andWhere('offer.locationCity ILIKE :city', { city: `%${dto.city}%` });
    }
    if (dto.careType) {
      qb.andWhere('offer.careType = :careType', { careType: dto.careType });
    }
    if (dto.startDate) {
      qb.andWhere('offer.createdAt >= :startDate', { startDate: dto.startDate });
    }
    if (dto.endDate) {
      qb.andWhere('offer.createdAt <= :endDate', { endDate: dto.endDate });
    }

    const limit = dto.limit ?? 10;
    const rawResults = await qb.limit(limit).getRawMany();

    // Query global completed services for percentage calculation
    const globalCountQb = this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.jobOffer', 'offer')
      .where('app.status = :acceptedStatus', { acceptedStatus: ApplicationStatus.ACCEPTED });

    if (dto.city) {
      globalCountQb.andWhere('offer.locationCity ILIKE :city', { city: `%${dto.city}%` });
    }
    if (dto.careType) {
      globalCountQb.andWhere('offer.careType = :careType', { careType: dto.careType });
    }
    if (dto.startDate) {
      globalCountQb.andWhere('offer.createdAt >= :startDate', { startDate: dto.startDate });
    }
    if (dto.endDate) {
      globalCountQb.andWhere('offer.createdAt <= :endDate', { endDate: dto.endDate });
    }

    const totalGlobalCompleted = await globalCountQb.getCount();

    const zones: ZoneItemReport[] = rawResults.map((row, index) => {
      const offers = parseInt(row.totalOffers, 10) || 0;
      const completed = parseInt(row.completedServices, 10) || 0;
      const fulfillmentRate =
        offers > 0 ? parseFloat(((completed / offers) * 100).toFixed(2)) : 0;
      const percentageOfTotalServed =
        totalGlobalCompleted > 0
          ? parseFloat(((completed / totalGlobalCompleted) * 100).toFixed(2))
          : 0;

      return {
        rank: index + 1,
        city: row.city,
        zone: row.zone,
        totalOffers: offers,
        completedServices: completed,
        fulfillmentRate,
        percentageOfTotalServed,
      };
    });

    const mostServedZone =
      zones.length > 0 && zones[0].completedServices > 0
        ? {
            city: zones[0].city,
            zone: zones[0].zone,
            completedServices: zones[0].completedServices,
          }
        : zones.length > 0
          ? {
              city: zones[0].city,
              zone: zones[0].zone,
              completedServices: 0,
            }
          : null;

    return {
      mostServedZone,
      totalCompletedServices: totalGlobalCompleted,
      zones,
    };
  }

  /**
   * Generates a high-level executive dashboard combining total platform offers,
   * hired services, predominant modality share, and the top five serviced zones.
   *
   * @returns Executive summary response object.
   */
  async getExecutiveSummary(): Promise<ExecutiveSummaryResponse> {
    const modalityReport = await this.getClientModalityReport({});
    const topZonesReport = await this.getTopZonesReport({ limit: 5 });

    let predominantModality: string | null = null;
    let maxOffers = -1;

    const modalityBreakdown = modalityReport.categories.map((cat) => {
      if (cat.totalOffers > maxOffers) {
        maxOffers = cat.totalOffers;
        predominantModality = cat.label;
      }
      return {
        category: cat.label,
        totalOffers: cat.totalOffers,
        sharePercentage: cat.marketSharePercentage,
      };
    });

    return {
      totalJobOffers: modalityReport.totalOffers,
      totalHiredServices: modalityReport.totalAcceptedServices,
      predominantModality: maxOffers > 0 ? predominantModality : null,
      topServedZone: topZonesReport.mostServedZone,
      modalityBreakdown,
      topFiveZones: topZonesReport.zones,
    };
  }
}
