import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { CaregiversService } from './caregivers.service';
import { CaregiversController } from './caregivers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CaregiverProfile, CaregiverDocument])],
  controllers: [CaregiversController],
  providers: [CaregiversService],
  exports: [CaregiversService],
})
export class CaregiversModule {}
