import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { CareSpecialty } from '../src/common/enums/care-specialty.enum';
import { User } from '../src/users/entities/user.entity';

describe('CareConnect API (e2e Complete Lifecycle)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'ci-e2e-secret-key-for-testing';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = app.get(DataSource);
    try {
      await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
    } catch {
      // ignore if empty or fresh
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      try {
        await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
        const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
        const userRepo = dataSource.getRepository(User);
        const admin = userRepo.create({
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'admin@careconnect.com',
          password: passwordHash,
          firstName: 'System',
          lastName: 'Admin',
          phone: '+573110000000',
          role: UserRole.ADMIN,
          isActive: true,
        });
        await userRepo.save(admin);
      } catch {
        // ignore
      }
    }
    await app?.close();
  });

  // Test state variables
  let caregiverToken = '';
  let caregiverId = '';
  let clientToken = '';
  let clientId = '';
  let adminToken = '';
  let jobOfferId = '';
  let applicationId = '';
  let contactRequestId = '';

  const caregiverData = {
    email: 'e2e-caregiver@example.com',
    password: 'Password123!',
    firstName: 'Camila',
    lastName: 'Perez',
    phone: '+573001112233',
    role: UserRole.CAREGIVER,
  };

  const clientData = {
    email: 'e2e-client@example.com',
    password: 'Password123!',
    firstName: 'David',
    lastName: 'Morales',
    phone: '+573105556677',
    role: UserRole.CLIENT,
  };

  describe('1. Module 01-Auth & Users', () => {

    it('POST /api/v1/auth/register - should register CAREGIVER and auto-seed profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(caregiverData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(caregiverData.email);
      expect(res.body.role).toBe(UserRole.CAREGIVER);
      caregiverId = res.body.id;
    });

    it('POST /api/v1/auth/register - should register CLIENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(clientData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.role).toBe(UserRole.CLIENT);
      clientId = res.body.id;
      expect(clientId).toBeDefined();
    });

    it('POST /api/v1/auth/register - should reject direct ADMIN registration with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'admin.infiltrator@example.com',
          password: 'Password123!',
          firstName: 'Bad',
          lastName: 'Actor',
          phone: '+573000000000',
          role: UserRole.ADMIN,
        })
        .expect(400);
    });

    it('POST /api/v1/auth/login - should authenticate CAREGIVER and return JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: caregiverData.email,
          password: caregiverData.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      caregiverToken = res.body.access_token;
    });

    it('POST /api/v1/auth/login - should authenticate CLIENT and return JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: clientData.email,
          password: clientData.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      clientToken = res.body.access_token;
    });

    it('GET /api/v1/users/me - should get user details for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(res.body.email).toBe(caregiverData.email);
    });
  });

  describe('2. Module 02-Caregiver-Profile', () => {
    it('PATCH /api/v1/caregivers/me - should update caregiver profile', async () => {
      const updateData = {
        bio: 'Compassionate licensed caregiver with 5 years experience specializing in post-surgery recovery.',
        yearsOfExperience: 5,
        specialties: [CareSpecialty.ELDERLY_CARE, CareSpecialty.COGNITIVE_DISABILITY],
        hourlyRate: 30.0,
        city: 'Bogota',
        neighborhoods: ['Chapinero', 'Teusaquillo'],
        maxCoverageRadiusKm: 12,
        availability: [
          {
            day: 'MONDAY',
            shifts: ['MORNING'],
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .patch('/api/v1/caregivers/me')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send(updateData);

      if (res.status !== 200) {
        console.error('PATCH /caregivers/me ERROR:', JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(200);

      expect(res.body.yearsOfExperience).toBe(5);
      expect(res.body.city).toBe('Bogota');
    });

    it('GET /api/v1/caregivers/me - should retrieve current caregiver profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/caregivers/me')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(res.body.city).toBe('Bogota');
    });

    it('GET /api/v1/caregivers/:id - should get public profile with masked sensitive data', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/caregivers/${caregiverId}`)
        .expect(200);

      expect(res.body).toHaveProperty('firstName', caregiverData.firstName);
      expect(res.body).not.toHaveProperty('phone');
      expect(res.body).not.toHaveProperty('email');
    });
  });

  describe('3. Module 03-Job-Offers', () => {
    it('POST /api/v1/job-offers - CLIENT should create an open job offer', async () => {
      const offerData = {
        title: 'Elderly assistance needed for senior father in Bogota',
        description: 'Assistance with routine medication, mobility, and preparation of healthy lunch.',
        careType: 'ELDERLY_CARE',
        locationCity: 'Bogota',
        locationZone: 'Chapinero',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        requiredSchedule: [{ day: 'MONDAY', shifts: ['MORNING'] }],
        budgetMin: 25.0,
        budgetMax: 35.0,
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/job-offers')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(offerData)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('OPEN');
      jobOfferId = res.body.id;
    });

    it('GET /api/v1/job-offers - should list public open job offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/job-offers?city=Bogota&page=1&limit=10')
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('totalItems');
    });

    it('GET /api/v1/job-offers/my-offers - CLIENT should view their offers with application count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/job-offers/my-offers')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('applicationsCount', 0);
    });
  });

  describe('4. Module 04-Applications & Privacy Unlocking', () => {
    it('POST /api/v1/job-offers/:id/apply - CAREGIVER should apply to open offer', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/job-offers/${jobOfferId}/apply`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          coverLetter: 'I am certified and live near Chapinero, fully available on Monday mornings.',
          proposedRate: 30.0,
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      applicationId = res.body.id;
    });

    it('POST /api/v1/job-offers/:id/apply - should reject duplicate application with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/job-offers/${jobOfferId}/apply`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          coverLetter: 'Attempting to apply a second time.',
        })
        .expect(409);
    });

    it('GET /api/v1/job-offers/:id/applications - CLIENT should view candidates with masked contact details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/job-offers/${jobOfferId}/applications`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].caregiver).toHaveProperty('firstName', 'Camila');
      expect(res.body[0].caregiver).not.toHaveProperty('phone');
      expect(res.body[0].caregiver).not.toHaveProperty('email');
    });

    it('PATCH /api/v1/applications/:id/status - CLIENT accepts application and unlocks mutual contact info', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'ACCEPTED' })
        .expect(200);

      expect(res.body.application.status).toBe('ACCEPTED');
      expect(res.body).toHaveProperty('unlockedContactDetails');
      expect(res.body.unlockedContactDetails.caregiver).toHaveProperty('phone', '+573001112233');
      expect(res.body.unlockedContactDetails.caregiver).toHaveProperty('whatsappUrl');
    });
  });

  describe('5. Module 05-Contact-Requests', () => {
    it('POST /api/v1/contact-requests - CLIENT sends direct inquiry to caregiver', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/contact-requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          caregiverId,
          initialMessage: 'Hello Camila, would love to coordinate weekly care sessions directly.',
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      contactRequestId = res.body.id;
    });

    it('POST /api/v1/contact-requests - should reject duplicate active inquiry with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contact-requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          caregiverId,
          initialMessage: 'Sending duplicate inquiry before previous is resolved.',
        })
        .expect(409);
    });

    it('PATCH /api/v1/contact-requests/:id/respond - CAREGIVER accepts contact request and unlocks details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/contact-requests/${contactRequestId}/respond`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({ status: 'ACCEPTED' })
        .expect(200);

      expect(res.body.contactRequest.status).toBe('ACCEPTED');
      expect(res.body).toHaveProperty('unlockedContactDetails');
    });

    it('GET /api/v1/contact-requests/:id - participant client sees revealed details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/contact-requests/${contactRequestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(res.body.participant).toHaveProperty('phone', '+573001112233');
    });
  });

  describe('6. Module 06-Reviews & Atomic Metrics', () => {
    it('POST /api/v1/caregivers/:caregiverId/reviews - CLIENT posts review with verified prior service', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/caregivers/${caregiverId}/reviews`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          rating: 5,
          comment: 'Outstanding caregiver! Extremely punctual, caring and attentive with my father.',
        })
        .expect(201);

      expect(res.body.rating).toBe(5);
    });

    it('POST /api/v1/caregivers/:caregiverId/reviews - should reject duplicate review with 409', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/caregivers/${caregiverId}/reviews`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          rating: 4,
          comment: 'Attempting to review a second time for the same caregiver engagement.',
        })
        .expect(409);
    });

    it('GET /api/v1/caregivers/:caregiverId/reviews - should list public reviews', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/caregivers/${caregiverId}/reviews?page=1&limit=10`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].rating).toBe(5);
      expect(res.body.data[0].client).toHaveProperty('firstName', 'David');
    });

    it('GET /api/v1/caregivers/:id - caregiver public profile should reflect atomically recalculated rating', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/caregivers/${caregiverId}`)
        .expect(200);

      expect(res.body.totalReviews).toBe(1);
      expect(Number(res.body.ratingAverage)).toBe(5);
    });
  });

  describe('7. Module 07-Admin Moderation & Suspension', () => {
    beforeAll(async () => {
      // Seed admin directly in database
      const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
      const userRepo = dataSource.getRepository(User);
      const admin = userRepo.create({
        email: 'system.admin@careconnect.com',
        password: passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        phone: '+573110000000',
        role: UserRole.ADMIN,
        isActive: true,
      });
      await userRepo.save(admin);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'system.admin@careconnect.com',
          password: 'AdminSecret123!',
        });
      adminToken = loginRes.body.access_token;
    });

    it('GET /api/v1/admin/documents/pending - ADMIN views pending documents queue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/documents/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PATCH /api/v1/admin/users/:id/status - ADMIN suspends caregiver account with ripple effect', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/users/${caregiverId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          suspensionReason: 'Breach of professional safety regulations.',
        })
        .expect(200);

      expect(res.body.isActive).toBe(false);
      expect(res.body.suspensionReason).toBe('Breach of professional safety regulations.');
    });

    it('Suspended user session should be immediately rejected with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });
  });

  describe('8. Bulk Operations (Batch Creation, Provisioning & Moderation)', () => {
    it('POST /api/v1/auth/bulk-register - should register multiple users in batch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/bulk-register')
        .send({
          users: [
            {
              email: 'bulk.caregiver1@example.com',
              password: 'Password123!',
              firstName: 'Bulk',
              lastName: 'Caregiver1',
              phone: '+573007771122',
              role: UserRole.CAREGIVER,
            },
            {
              email: 'bulk.client1@example.com',
              password: 'Password123!',
              firstName: 'Bulk',
              lastName: 'Client1',
              phone: '+573007773344',
              role: UserRole.CLIENT,
            },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(2);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0]).not.toHaveProperty('password');
      expect(res.body.users[1]).not.toHaveProperty('password');
    });

    it('POST /api/v1/job-offers/bulk - CLIENT should create multiple job offers in a single transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/job-offers/bulk')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          offers: [
            {
              title: 'Weekend elderly companion needed',
              description: 'Seeking a warm caregiver to accompany my grandmother during weekends.',
              careType: CareSpecialty.ELDERLY_CARE,
              locationCity: 'Bogota',
              locationZone: 'Usaquen',
              startDate: '2026-12-01',
              endDate: '2026-12-31',
              requiredSchedule: [
                { day: 'SATURDAY', shifts: ['MORNING'] },
              ],
              budgetMin: 35,
              budgetMax: 50,
            },
            {
              title: 'Weekday afternoon child tutoring and care',
              description: 'Looking for child care assistance with elementary school homework and snacks.',
              careType: CareSpecialty.CHILD_CARE,
              locationCity: 'Bogota',
              locationZone: 'Chapinero',
              startDate: '2026-12-05',
              endDate: '2026-12-25',
              requiredSchedule: [
                { day: 'MONDAY', shifts: ['AFTERNOON'] },
              ],
              budgetMin: 25,
              budgetMax: 40,
            },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(2);
      expect(res.body.jobOffers).toHaveLength(2);
      expect(res.body.jobOffers[0].status).toBe('OPEN');
      expect(res.body.jobOffers[1].status).toBe('OPEN');
    });

    it('POST /api/v1/admin/users/bulk - ADMIN should provision multiple users with role-specific setup', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/users/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          users: [
            {
              email: 'admin.bulk.caregiver@example.com',
              password: 'Password123!',
              firstName: 'BulkAdmin',
              lastName: 'Caregiver',
              phone: '+573118889900',
              role: UserRole.CAREGIVER,
            },
            {
              email: 'admin.bulk.client@example.com',
              password: 'Password123!',
              firstName: 'BulkAdmin',
              lastName: 'Client',
              phone: '+573118889911',
              role: UserRole.CLIENT,
            },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(2);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0].email).toBe('admin.bulk.caregiver@example.com');
    });

    it('PATCH /api/v1/admin/documents/bulk-verify - ADMIN should batch verify documents', async () => {
      const pendingRes = await request(app.getHttpServer())
        .get('/api/v1/admin/documents/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (pendingRes.body.length > 0) {
        const docToVerify = pendingRes.body[0];
        const res = await request(app.getHttpServer())
          .patch('/api/v1/admin/documents/bulk-verify')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            items: [
              {
                id: docToVerify.id,
                status: 'APPROVED',
              },
            ],
          })
          .expect(200);

        expect(res.body.count).toBe(1);
        expect(res.body.documents[0].verificationStatus).toBe('APPROVED');
      }
    });
  });
});
