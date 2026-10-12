import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';

describe('Auth & Users (e2e)', () => {
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
      // If table does not exist prior to synchronization, ignore
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      try {
        await dataSource.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
      } catch {
        // ignore
      }
    }
    await app?.close();
  });

  describe('Authentication flow', () => {
    const testCaregiver = {
      email: 'e2e-caregiver@example.com',
      password: 'Password123!',
      firstName: 'Maria',
      lastName: 'Gomez',
      phone: '+573001234567',
      role: UserRole.CAREGIVER,
    };

    let authToken = '';

    it('POST /api/v1/auth/register - should successfully register a new CAREGIVER', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testCaregiver)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testCaregiver.email);
      expect(res.body.role).toBe(UserRole.CAREGIVER);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('POST /api/v1/auth/register - should reject duplicate email with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testCaregiver)
        .expect(409);
    });

    it('POST /api/v1/auth/login - should successfully login and return JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testCaregiver.email,
          password: testCaregiver.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testCaregiver.email);
      authToken = res.body.access_token;
    });

    it('POST /api/v1/auth/login - should reject invalid credentials with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testCaregiver.email,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('GET /api/v1/users/me - should get user profile when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.email).toBe(testCaregiver.email);
      expect(res.body.firstName).toBe(testCaregiver.firstName);
    });

    it('GET /api/v1/users/me - should reject unauthorized requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);
    });
  });
});
