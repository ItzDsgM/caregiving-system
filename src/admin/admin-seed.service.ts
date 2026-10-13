import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { CaregiverProfile } from '../caregiver-profiles/entities/caregiver-profile.entity';
import { CaregiverDocument } from '../caregiver-profiles/entities/caregiver-document.entity';
import { JobOffer } from '../job-offers/entities/job-offer.entity';
import { Application } from '../applications/entities/application.entity';
import { ContactRequest } from '../contact-requests/entities/contact-request.entity';
import { Review } from '../reviews/entities/review.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CareSpecialty } from '../common/enums/care-specialty.enum';
import { JobOfferStatus } from '../common/enums/job-offer-status.enum';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { ContactRequestStatus } from '../common/enums/contact-request-status.enum';
import { VerificationStatus } from '../common/enums/verification-status.enum';
import { DocumentType } from '../common/enums/document-type.enum';

/**
 * Lifecycle and administrative service that seeds initial records into PostgreSQL.
 * Powers automated boot initialization and on-demand database seeding via endpoint and CLI script.
 */
@Injectable()
export class AdminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * NestJS lifecycle hook called after all modules have been initialized.
   * Ensures the platform always has a default admin account seeded if none exists.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdmin();
  }

  /**
   * Seeds the primary platform administrator if no admin account exists.
   */
  async seedAdmin(): Promise<User> {
    let admin = await this.userRepository.findOne({
      where: { role: UserRole.ADMIN },
    });

    if (!admin) {
      this.logger.log('Seeding initial administrator user...');
      const hashedPassword = await bcrypt.hash('AdminSecret123!', 10);
      admin = this.userRepository.create({
        email: 'admin@careconnect.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        phone: '+573110000000',
        role: UserRole.ADMIN,
        isActive: true,
      });

      admin = await this.userRepository.save(admin);
      this.logger.log('Administrator admin@careconnect.com seeded successfully.');
    }

    return admin;
  }

  /**
   * Populates the database with a complete, realistic dataset for testing and demonstration:
   * - 1 Administrator (admin@careconnect.com)
   * - 2 Verified and pending Caregivers with profiles and documents (María Gómez, Carlos Ruiz)
   * - 2 Clients with posted demands (Juan Pérez, Ana Morales)
   * - 2 Job Offers (Elderly care, Post-operative rehabilitation)
   * - 2 Job Applications (Accepted, Pending)
   * - 2 Direct Contact Requests (Accepted, Pending)
   * - 1 Verified Review and Rating
   *
   * @returns Detailed summary of seeded entities and counts.
   */
  async seedDatabase(): Promise<{
    message: string;
    counts: {
      users: number;
      caregivers: number;
      clients: number;
      jobOffers: number;
      applications: number;
      contactRequests: number;
      reviews: number;
    };
  }> {
    this.logger.log('Executing comprehensive database seeding...');

    const userRepo = this.dataSource.getRepository(User);
    const profileRepo = this.dataSource.getRepository(CaregiverProfile);
    const docRepo = this.dataSource.getRepository(CaregiverDocument);
    const jobOfferRepo = this.dataSource.getRepository(JobOffer);
    const appRepo = this.dataSource.getRepository(Application);
    const contactRepo = this.dataSource.getRepository(ContactRequest);
    const reviewRepo = this.dataSource.getRepository(Review);

    // 1. Seed Admin
    await this.seedAdmin();

    const commonPassword = await bcrypt.hash('Password123!', 10);

    // 2. Seed Caregiver 1: María Gómez (Verified Elderly Care Nurse)
    let maria = await userRepo.findOne({ where: { email: 'maria.gomez@careconnect.com' } });
    if (!maria) {
      maria = await userRepo.save(
        userRepo.create({
          email: 'maria.gomez@careconnect.com',
          password: commonPassword,
          firstName: 'María',
          lastName: 'Gómez',
          phone: '+573101234567',
          role: UserRole.CAREGIVER,
          isActive: true,
        }),
      );

      let mariaProfile = await profileRepo.findOne({ where: { userId: maria.id } });
      if (!mariaProfile) {
        mariaProfile = profileRepo.create({
          userId: maria.id,
          city: 'Cali',
          neighborhoods: ['Norte', 'Ciudad Jardín', 'Oeste'],
          hourlyRate: 35000,
          yearsOfExperience: 8,
          specialties: [CareSpecialty.ELDERLY_CARE, CareSpecialty.CHILD_CARE],
          bio: 'Enfermera profesional con 8 años de experiencia especializada en cuidado de adulto mayor y pediatría.',
          isDocumentVerified: true,
          isPublic: true,
          ratingAverage: 5.0,
          totalReviews: 1,
        });
        mariaProfile = await profileRepo.save(mariaProfile);

        await docRepo.save([
          docRepo.create({
            caregiverProfileId: mariaProfile.id,
            documentType: DocumentType.ID_CARD,
            fileUrl: 'uploads/documents/maria_id.pdf',
            verificationStatus: VerificationStatus.APPROVED,
            adminNotes: 'Document verified against national identity database.',
          }),
          docRepo.create({
            caregiverProfileId: mariaProfile.id,
            documentType: DocumentType.CRIMINAL_RECORD,
            fileUrl: 'uploads/documents/maria_background.pdf',
            verificationStatus: VerificationStatus.APPROVED,
            adminNotes: 'Clean criminal record certified.',
          }),
        ]);
      }
    }

    // 3. Seed Caregiver 2: Carlos Ruiz (Physical Therapist)
    let carlos = await userRepo.findOne({ where: { email: 'carlos.ruiz@careconnect.com' } });
    if (!carlos) {
      carlos = await userRepo.save(
        userRepo.create({
          email: 'carlos.ruiz@careconnect.com',
          password: commonPassword,
          firstName: 'Carlos',
          lastName: 'Ruiz',
          phone: '+573159876543',
          role: UserRole.CAREGIVER,
          isActive: true,
        }),
      );

      let carlosProfile = await profileRepo.findOne({ where: { userId: carlos.id } });
      if (!carlosProfile) {
        carlosProfile = profileRepo.create({
          userId: carlos.id,
          city: 'Cali',
          neighborhoods: ['Sur', 'Valle del Lili'],
          hourlyRate: 40000,
          yearsOfExperience: 5,
          specialties: [CareSpecialty.PHYSICAL_DISABILITY],
          bio: 'Fisioterapeuta enfocado en rehabilitación física y recuperación de movilidad.',
          isDocumentVerified: false,
          isPublic: true,
          ratingAverage: 0,
          totalReviews: 0,
        });
        carlosProfile = await profileRepo.save(carlosProfile);

        await docRepo.save(
          docRepo.create({
            caregiverProfileId: carlosProfile.id,
            documentType: DocumentType.ID_CARD,
            fileUrl: 'uploads/documents/carlos_id.pdf',
            verificationStatus: VerificationStatus.PENDING,
          }),
        );
      }
    }

    // 4. Seed Client 1: Juan Pérez
    let juan = await userRepo.findOne({ where: { email: 'juan.perez@careconnect.com' } });
    if (!juan) {
      juan = await userRepo.save(
        userRepo.create({
          email: 'juan.perez@careconnect.com',
          password: commonPassword,
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '+573187654321',
          role: UserRole.CLIENT,
          isActive: true,
        }),
      );
    }

    // 5. Seed Client 2: Ana Morales
    let ana = await userRepo.findOne({ where: { email: 'ana.morales@careconnect.com' } });
    if (!ana) {
      ana = await userRepo.save(
        userRepo.create({
          email: 'ana.morales@careconnect.com',
          password: commonPassword,
          firstName: 'Ana',
          lastName: 'Morales',
          phone: '+573123456789',
          role: UserRole.CLIENT,
          isActive: true,
        }),
      );
    }

    // 6. Seed Job Offers
    let offer1 = await jobOfferRepo.findOne({ where: { title: 'Cuidado de Adulto Mayor en Jornada Completa' } });
    if (!offer1 && juan) {
      offer1 = await jobOfferRepo.save(
        jobOfferRepo.create({
          clientId: juan.id,
          title: 'Cuidado de Adulto Mayor en Jornada Completa',
          description: 'Buscamos enfermera o cuidadora atenta para adulto mayor de 82 años.',
          careType: CareSpecialty.ELDERLY_CARE,
          locationCity: 'Cali',
          locationZone: 'Ciudad Jardín',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          budgetMin: 35000,
          budgetMax: 45000,
          status: JobOfferStatus.OPEN,
          requiredSchedule: [{ day: 'MONDAY', shifts: ['MORNING', 'AFTERNOON'] }],
        }),
      );
    }

    let offer2 = await jobOfferRepo.findOne({ where: { title: 'Acompañamiento en Terapia Física y Recuperación' } });
    if (!offer2 && ana) {
      offer2 = await jobOfferRepo.save(
        jobOfferRepo.create({
          clientId: ana.id,
          title: 'Acompañamiento en Terapia Física y Recuperación',
          description: 'Acompañamiento 3 tardes por semana para recuperación de cirugía ortopédica.',
          careType: CareSpecialty.PHYSICAL_DISABILITY,
          locationCity: 'Cali',
          locationZone: 'Norte',
          startDate: '2026-11-05',
          endDate: '2026-12-15',
          budgetMin: 40000,
          budgetMax: 50000,
          status: JobOfferStatus.OPEN,
          requiredSchedule: [{ day: 'TUESDAY', shifts: ['AFTERNOON'] }],
        }),
      );
    }

    // 7. Seed Applications
    if (offer1 && maria) {
      const existingApp1 = await appRepo.findOne({
        where: { jobOfferId: offer1.id, caregiverId: maria.id },
      });
      if (!existingApp1) {
        await appRepo.save(
          appRepo.create({
            jobOfferId: offer1.id,
            caregiverId: maria.id,
            coverLetter: 'Cuento con amplia experiencia en enfermería y primeros auxilios.',
            proposedRate: 35000,
            status: ApplicationStatus.ACCEPTED,
          }),
        );
      }
    }

    if (offer2 && carlos) {
      const existingApp2 = await appRepo.findOne({
        where: { jobOfferId: offer2.id, caregiverId: carlos.id },
      });
      if (!existingApp2) {
        await appRepo.save(
          appRepo.create({
            jobOfferId: offer2.id,
            caregiverId: carlos.id,
            coverLetter: 'Experto en terapia física ambulatoria y recuperación articular.',
            proposedRate: 40000,
            status: ApplicationStatus.PENDING,
          }),
        );
      }
    }

    // 8. Seed Contact Requests
    if (ana && maria) {
      const existingContact1 = await contactRepo.findOne({
        where: { clientId: ana.id, caregiverId: maria.id },
      });
      if (!existingContact1) {
        await contactRepo.save(
          contactRepo.create({
            clientId: ana.id,
            caregiverId: maria.id,
            initialMessage: 'Hola María, me gustaría consultar tus tarifas para cuidados los fines de semana.',
            status: ContactRequestStatus.ACCEPTED,
            respondedAt: new Date(),
          }),
        );
      }
    }

    if (juan && carlos) {
      const existingContact2 = await contactRepo.findOne({
        where: { clientId: juan.id, caregiverId: carlos.id },
      });
      if (!existingContact2) {
        await contactRepo.save(
          contactRepo.create({
            clientId: juan.id,
            caregiverId: carlos.id,
            initialMessage: 'Buenas tardes Carlos, quisiéramos programar una sesión de valoración.',
            status: ContactRequestStatus.PENDING,
          }),
        );
      }
    }

    // 9. Seed Reviews
    if (juan && maria) {
      const existingReview = await reviewRepo.findOne({
        where: { clientId: juan.id, caregiverId: maria.id },
      });
      if (!existingReview) {
        await reviewRepo.save(
          reviewRepo.create({
            clientId: juan.id,
            caregiverId: maria.id,
            rating: 5,
            comment: 'Excelente profesional, muy atenta, puntual y con gran vocación de servicio.',
          }),
        );
      }
    }

    const totalUsers = await userRepo.count();
    const totalOffers = await jobOfferRepo.count();
    const totalApps = await appRepo.count();
    const totalContacts = await contactRepo.count();
    const totalReviews = await reviewRepo.count();

    this.logger.log('Database seeding completed successfully.');

    return {
      message: 'Initial dataset seeded successfully',
      counts: {
        users: totalUsers,
        caregivers: 2,
        clients: 2,
        jobOffers: totalOffers,
        applications: totalApps,
        contactRequests: totalContacts,
        reviews: totalReviews,
      },
    };
  }
}
