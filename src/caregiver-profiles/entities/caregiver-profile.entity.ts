import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CareSpecialty } from '../../common/enums/care-specialty.enum';
import { User } from '../../users/entities/user.entity';
import type { CaregiverDocument } from './caregiver-document.entity';

@Entity('caregiver_profiles')
export class CaregiverProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.caregiverProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'int', default: 0 })
  yearsOfExperience: number;

  @Column({
    type: 'enum',
    enum: CareSpecialty,
    array: true,
    default: [],
  })
  specialties: CareSpecialty[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourlyRate: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dailyRate8h: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dailyRate12h: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  overnightRate: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  neighborhoods: string[];

  @Column({ type: 'int', nullable: true })
  maxCoverageRadiusKm: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  availability: Array<{ day: string; shifts: string[] }>;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  ratingAverage: number;

  @Column({ type: 'int', default: 0 })
  totalReviews: number;

  @Column({ type: 'boolean', default: false })
  isDocumentVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @OneToMany('CaregiverDocument', (doc: any) => doc.caregiverProfile)
  documents: CaregiverDocument[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
