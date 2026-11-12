import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { Application } from '../applications/entities/application.entity';
import { ContactRequest } from '../contact-requests/entities/contact-request.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      User,
      CaregiverProfile,
      Application,
      ContactRequest,
      JobOffer,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
