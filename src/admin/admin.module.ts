import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { User } from '../users/entities/user.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CaregiverDocument,
      CaregiverProfile,
      User,
      JobOffer,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminSeedService],
  exports: [AdminService, AdminSeedService],
})
export class AdminModule {}
