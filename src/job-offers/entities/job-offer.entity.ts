import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { JobOfferStatus } from '../../common/enums/job-offer-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('job_offers')
export class JobOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: CareSpecialty,
  })
  careType: CareSpecialty;

  @Column({ type: 'varchar', length: 100 })
  locationCity: string;

  @Column({ type: 'varchar', length: 100 })
  locationZone: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  requiredSchedule: Array<{ day: string; shifts: string[] }>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budgetMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budgetMax: number;

  @Column({
    type: 'enum',
    enum: JobOfferStatus,
    default: JobOfferStatus.OPEN,
  })
  status: JobOfferStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
