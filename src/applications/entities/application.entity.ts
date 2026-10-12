import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApplicationStatus } from '../../common/enums/application-status.enum';
import { JobOffer } from '../../job-offers/entities/job-offer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('applications')
@Index(['jobOfferId', 'caregiverId'], { unique: true })
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  jobOfferId: string;

  @ManyToOne(() => JobOffer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobOfferId' })
  jobOffer: JobOffer;

  @Column({ type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiverId' })
  caregiver: User;

  @Column({ type: 'text' })
  coverLetter: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  proposedRate: number | null;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @CreateDateColumn()
  appliedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
