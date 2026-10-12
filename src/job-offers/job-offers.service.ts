import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { CreateJobOfferDto } from './dtos/create-job-offer.dto';
import { UpdateJobOfferDto } from './dtos/update-job-offer.dto';
import { FilterJobOffersDto } from './dtos/filter-job-offers.dto';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';

import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class JobOffersService {
  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOffersRepository: Repository<JobOffer>,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async create(clientId: string, dto: CreateJobOfferDto): Promise<JobOffer> {
    this.validateBudgets(dto.budgetMin, dto.budgetMax);
    this.validateDates(dto.startDate, dto.endDate);

    const offer = this.jobOffersRepository.create({
      ...dto,
      clientId,
      status: JobOfferStatus.OPEN,
    });

    return this.jobOffersRepository.save(offer);
  }

  async getMyOffers(clientId: string): Promise<Array<JobOffer & { applicationsCount: number }>> {
    const offers = await this.jobOffersRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });

    const result = [];
    for (const offer of offers) {
      const count = await this.applicationsService.countByJobOffer(offer.id);
      result.push({
        ...offer,
        applicationsCount: count,
      });
    }

    return result;
  }

  async findPublicOffers(filterDto: FilterJobOffersDto) {
    const page = filterDto.page ?? 1;
    const limit = filterDto.limit ?? 10;
    const skip = (page - 1) * limit;

    const query = this.jobOffersRepository
      .createQueryBuilder('jobOffer')
      .where('jobOffer.status = :status', { status: JobOfferStatus.OPEN });

    if (filterDto.city) {
      query.andWhere('jobOffer.locationCity ILIKE :city', {
        city: `%${filterDto.city}%`,
      });
    }

    if (filterDto.careType) {
      query.andWhere('jobOffer.careType = :careType', {
        careType: filterDto.careType,
      });
    }

    if (filterDto.minBudget) {
      query.andWhere('jobOffer.budgetMax >= :minBudget', {
        minBudget: filterDto.minBudget,
      });
    }

    if (filterDto.maxBudget) {
      query.andWhere('jobOffer.budgetMin <= :maxBudget', {
        maxBudget: filterDto.maxBudget,
      });
    }

    query.orderBy('jobOffer.createdAt', 'DESC').skip(skip).take(limit);

    const [data, totalItems] = await query.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async findById(id: string): Promise<JobOffer> {
    const offer = await this.jobOffersRepository.findOne({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException(`Job offer with ID "${id}" was not found`);
    }

    return offer;
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateJobOfferDto,
  ): Promise<JobOffer> {
    const offer = await this.findById(id);

    if (offer.clientId !== clientId) {
      throw new ForbiddenException(
        'You do not have permission to modify this job offer',
      );
    }

    if (offer.status !== JobOfferStatus.OPEN) {
      throw new BadRequestException('Only OPEN job offers can be modified');
    }

    const newBudgetMin = dto.budgetMin ?? Number(offer.budgetMin);
    const newBudgetMax = dto.budgetMax ?? Number(offer.budgetMax);
    this.validateBudgets(newBudgetMin, newBudgetMax);

    const newStartDate = dto.startDate ?? offer.startDate;
    const newEndDate = dto.endDate ?? offer.endDate;
    if (dto.startDate || dto.endDate) {
      this.validateDates(newStartDate, newEndDate, !!dto.startDate);
    }

    Object.assign(offer, dto);

    return this.jobOffersRepository.save(offer);
  }

  async updateStatus(
    clientId: string,
    id: string,
    status: JobOfferStatus,
  ): Promise<JobOffer> {
    const offer = await this.findById(id);

    if (offer.clientId !== clientId) {
      throw new ForbiddenException(
        'You do not have permission to change this job offer status',
      );
    }

    offer.status = status;

    return this.jobOffersRepository.save(offer);
  }

  private validateBudgets(min: number, max: number): void {
    if (max < min) {
      throw new BadRequestException(
        'budgetMax must be greater than or equal to budgetMin',
      );
    }
  }

  private validateDates(
    startDateStr: string,
    endDateStr: string,
    enforceFutureStart = true,
  ): void {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (enforceFutureStart) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (start < today) {
        throw new BadRequestException(
          'startDate must be today or a future date',
        );
      }
    }

    if (end < start) {
      throw new BadRequestException(
        'endDate must be greater than or equal to startDate',
      );
    }
  }
}
