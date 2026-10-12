import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobOffer } from './entities/job-offer.entity';
import { JobOffersService } from './job-offers.service';
import { JobOffersController } from './job-offers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobOffer])],
  controllers: [JobOffersController],
  providers: [JobOffersService],
  exports: [JobOffersService],
})
export class JobOffersModule {}
