import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { Application } from '../applications/entities/application.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobOffer, Application, CaregiverProfile])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
