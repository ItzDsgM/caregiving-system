import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';
import type { CaregiverProfile } from '../../caregiver-profiles/entities/caregiver-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  suspensionReason: string | null;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Exclude()
  @Column({ type: 'timestamp with time zone', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  @Column({ default: false })
  isTwoFactorEnabled: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  twoFactorSecret: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLogoutAt: Date | null;

  @OneToOne('CaregiverProfile', (profile: any) => profile.user, {
    nullable: true,
  })
  caregiverProfile?: CaregiverProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
