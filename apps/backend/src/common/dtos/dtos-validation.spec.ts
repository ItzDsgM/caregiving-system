import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { RegisterDto } from '../../auth/dtos/register.dto';
import { LoginDto } from '../../auth/dtos/login.dto';
import { ForgotPasswordDto } from '../../auth/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../../auth/dtos/reset-password.dto';
import { UpdateUserDto } from '../../users/dtos/update-user.dto';
import { UpdateCaregiverProfileDto } from '../../caregivers/dtos/update-caregiver-profile.dto';
import { UploadDocumentDto } from '../../caregivers/dtos/upload-document.dto';
import { SearchCaregiversDto } from '../../caregivers/dtos/search-caregivers.dto';
import { CreateJobOfferDto } from '../../job-offers/dtos/create-job-offer.dto';
import { UpdateJobOfferDto } from '../../job-offers/dtos/update-job-offer.dto';
import { UpdateJobOfferStatusDto } from '../../job-offers/dtos/update-job-offer-status.dto';
import { FilterJobOffersDto } from '../../job-offers/dtos/filter-job-offers.dto';
import { ApplyJobOfferDto } from '../../applications/dtos/apply-job-offer.dto';
import { UpdateApplicationStatusDto } from '../../applications/dtos/update-application-status.dto';
import { CreateContactRequestDto } from '../../contact-requests/dtos/create-contact-request.dto';
import { RespondContactRequestDto } from '../../contact-requests/dtos/respond-contact-request.dto';
import { CreateReviewDto } from '../../reviews/dtos/create-review.dto';
import { VerifyDocumentDto } from '../../admin/dtos/verify-document.dto';
import { UpdateUserStatusDto } from '../../admin/dtos/update-user-status.dto';
import { BulkRegisterDto } from '../../auth/dtos/bulk-register.dto';
import { BulkCreateUsersDto } from '../../admin/dtos/bulk-create-users.dto';
import { BulkVerifyDocumentsDto } from '../../admin/dtos/bulk-verify-documents.dto';
import { BulkCreateJobOffersDto } from '../../job-offers/dtos/bulk-create-job-offers.dto';
import { PaginationDto } from './pagination.dto';
import { UserRole } from '../enums/user-role.enum';
import { CareSpecialty } from '../enums/care-specialty.enum';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { ShiftType } from '../enums/shift-type.enum';
import { DocumentType } from '../enums/document-type.enum';
import { VerificationStatus } from '../enums/verification-status.enum';
import { JobOfferStatus } from '../enums/job-offer-status.enum';
import { ApplicationStatus } from '../enums/application-status.enum';
import { ContactRequestStatus } from '../enums/contact-request-status.enum';

// Same options as the global pipe configured in main.ts (RNF03)
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

type Ctor<T> = new () => T;

async function validate<T>(
  metatype: Ctor<T>,
  value: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<T> {
  return (await pipe.transform(value, { type, metatype })) as T;
}

async function messagesOf<T>(
  metatype: Ctor<T>,
  value: unknown,
  type: ArgumentMetadata['type'] = 'body',
): Promise<string[]> {
  try {
    await validate(metatype, value, type);
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    const res = (e as BadRequestException).getResponse() as { message: string[] };
    return Array.isArray(res.message) ? res.message : [res.message];
  }
  throw new Error('Expected validation to fail but it passed');
}

const UUID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const slot = { day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] };

describe('DTO validation (global ValidationPipe contract)', () => {
  describe('RegisterDto (RF01.1)', () => {
    const valid = {
      email: 'a@b.com',
      password: 'Passw0rdX',
      firstName: 'A',
      lastName: 'B',
      phone: '+573001112233',
      role: UserRole.CAREGIVER,
    };

    it('should accept CAREGIVER and CLIENT payloads', async () => {
      await expect(validate(RegisterDto, valid)).resolves.toBeDefined();
      await expect(
        validate(RegisterDto, { ...valid, role: UserRole.CLIENT }),
      ).resolves.toBeDefined();
    });

    it('should reject the ADMIN role (RF01.1.2)', async () => {
      const msgs = await messagesOf(RegisterDto, { ...valid, role: UserRole.ADMIN });
      expect(msgs.join()).toContain('Admin role registration is prohibited');
    });

    it.each([
      ['too short', 'Ab1'],
      ['no uppercase', 'password1'],
      ['no lowercase', 'PASSWORD1'],
      ['no number', 'Passwordd'],
    ])('should reject weak password (%s)', async (_label, password) => {
      await messagesOf(RegisterDto, { ...valid, password });
    });

    it('should reject invalid email and missing names/phone', async () => {
      const msgs = await messagesOf(RegisterDto, {
        ...valid,
        email: 'nope',
        firstName: '',
        lastName: '',
        phone: '',
      });
      expect(msgs).toEqual(
        expect.arrayContaining([
          'Invalid email address',
          'First name is required',
          'Last name is required',
          'Phone number is required',
        ]),
      );
    });

    it('should strip/reject unknown properties (no mass assignment of isActive)', async () => {
      const msgs = await messagesOf(RegisterDto, { ...valid, isActive: false });
      expect(msgs.join()).toContain('property isActive should not exist');
    });
  });

  describe('LoginDto / ForgotPasswordDto / ResetPasswordDto', () => {
    it('should validate login credentials shape', async () => {
      await expect(
        validate(LoginDto, { email: 'a@b.com', password: 'x' }),
      ).resolves.toBeDefined();
      await messagesOf(LoginDto, { email: 'bad', password: '' });
    });

    it('should validate forgot-password email', async () => {
      await expect(
        validate(ForgotPasswordDto, { email: 'a@b.com' }),
      ).resolves.toBeDefined();
      await messagesOf(ForgotPasswordDto, { email: 'bad' });
    });

    it('should validate reset-password token and password complexity', async () => {
      await expect(
        validate(ResetPasswordDto, { token: 'abc', newPassword: 'Passw0rdX' }),
      ).resolves.toBeDefined();
      await messagesOf(ResetPasswordDto, { token: '', newPassword: 'weak' });
    });
  });

  describe('UpdateUserDto (RF01.5.2)', () => {
    it('should allow partial updates of firstName, lastName and phone only', async () => {
      await expect(validate(UpdateUserDto, {})).resolves.toBeDefined();
      await expect(
        validate(UpdateUserDto, { firstName: 'N', lastName: 'M', phone: '1' }),
      ).resolves.toBeDefined();
    });

    it('should not allow changing email or role', async () => {
      await messagesOf(UpdateUserDto, { email: 'x@y.z' });
      await messagesOf(UpdateUserDto, { role: UserRole.ADMIN });
    });
  });

  describe('UpdateCaregiverProfileDto (RF02.1 / RF02.2)', () => {
    it('should accept a complete valid profile', async () => {
      const dto = await validate(UpdateCaregiverProfileDto, {
        bio: 'x'.repeat(60),
        yearsOfExperience: 3,
        specialties: [CareSpecialty.ELDERLY_CARE, CareSpecialty.CHILD_CARE],
        hourlyRate: 15000,
        dailyRate8h: 100000,
        dailyRate12h: 140000,
        overnightRate: 120000,
        city: 'Bogota',
        neighborhoods: ['Chapinero'],
        maxCoverageRadiusKm: 10,
        availability: [slot],
      });
      expect(dto.availability?.[0]).toBeDefined();
    });

    it('should enforce bio length 50..1500', async () => {
      await messagesOf(UpdateCaregiverProfileDto, { bio: 'short' });
      await messagesOf(UpdateCaregiverProfileDto, { bio: 'x'.repeat(1501) });
      await expect(
        validate(UpdateCaregiverProfileDto, { bio: 'x'.repeat(50) }),
      ).resolves.toBeDefined();
      await expect(
        validate(UpdateCaregiverProfileDto, { bio: 'x'.repeat(1500) }),
      ).resolves.toBeDefined();
    });

    it('should reject negative experience and non-positive rates', async () => {
      const msgs = await messagesOf(UpdateCaregiverProfileDto, {
        yearsOfExperience: -1,
        hourlyRate: 0,
        dailyRate8h: -5,
        dailyRate12h: 0,
        overnightRate: -1,
        maxCoverageRadiusKm: 0,
      });
      expect(msgs).toEqual(
        expect.arrayContaining([
          'Years of experience cannot be negative',
          'Hourly rate must be a positive number',
          'Daily rate for 8h must be a positive number',
          'Daily rate for 12h must be a positive number',
          'Overnight rate must be a positive number',
          'Max coverage radius must be at least 1 kilometer',
        ]),
      );
    });

    it('should reject invalid specialties and malformed availability', async () => {
      await messagesOf(UpdateCaregiverProfileDto, { specialties: ['PLUMBING'] });
      await messagesOf(UpdateCaregiverProfileDto, {
        availability: [{ day: 'FUNDAY', shifts: [] }],
      });
      await messagesOf(UpdateCaregiverProfileDto, { neighborhoods: [1, 2] });
    });
  });

  describe('UploadDocumentDto (RF02.3.2)', () => {
    it('should accept each document type and reject unknown ones', async () => {
      for (const documentType of Object.values(DocumentType)) {
        await expect(
          validate(UploadDocumentDto, { documentType }),
        ).resolves.toBeDefined();
      }
      await messagesOf(UploadDocumentDto, { documentType: 'SELFIE' });
      await messagesOf(UploadDocumentDto, {});
    });
  });

  describe('Pagination & search queries (RF04.1)', () => {
    it('should apply defaults page=1, limit=10', async () => {
      const dto = await validate(PaginationDto, {}, 'query');
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it('should coerce numeric query strings', async () => {
      const dto = await validate(PaginationDto, { page: '3', limit: '25' }, 'query');
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(25);
    });

    it('should cap limit at 50 and require page >= 1', async () => {
      await messagesOf(PaginationDto, { limit: '51' }, 'query');
      await messagesOf(PaginationDto, { page: '0' }, 'query');
      await messagesOf(PaginationDto, { page: '1.5' }, 'query');
    });

    it('should parse all caregiver search filters', async () => {
      const dto = await validate(
        SearchCaregiversDto,
        {
          specialty: CareSpecialty.ELDERLY_CARE,
          city: 'bog',
          minPrice: '10',
          maxPrice: '50',
          minRating: '4',
          onlyVerified: 'true',
          sortBy: 'price_asc',
        },
        'query',
      );
      expect(dto).toMatchObject({
        specialty: CareSpecialty.ELDERLY_CARE,
        city: 'bog',
        minPrice: 10,
        maxPrice: 50,
        minRating: 4,
        onlyVerified: true,
        sortBy: 'price_asc',
      });
    });

    it('should treat onlyVerified=false as boolean false', async () => {
      const dto = await validate(SearchCaregiversDto, { onlyVerified: 'false' }, 'query');
      expect(dto.onlyVerified).toBe(false);
    });

    it('should reject invalid specialty, sortBy and non-positive numbers', async () => {
      await messagesOf(SearchCaregiversDto, { specialty: 'X' }, 'query');
      await messagesOf(SearchCaregiversDto, { sortBy: 'random' }, 'query');
      await messagesOf(SearchCaregiversDto, { minPrice: '-1' }, 'query');
      await messagesOf(SearchCaregiversDto, { minRating: 'abc' }, 'query');
    });
  });

  describe('CreateJobOfferDto (RF03.1.2)', () => {
    const valid = {
      title: 'Cuidado nocturno abuela',
      description: 'Necesito cuidadora para adulto mayor con movilidad reducida.',
      careType: CareSpecialty.ELDERLY_CARE,
      locationCity: 'Bogota',
      locationZone: 'Chapinero',
      startDate: '2030-01-10',
      endDate: '2030-02-10',
      requiredSchedule: [slot],
      budgetMin: 1000,
      budgetMax: 2000,
    };

    it('should accept a valid offer', async () => {
      await expect(validate(CreateJobOfferDto, valid)).resolves.toBeDefined();
    });

    it('should enforce title >= 10 and description >= 30 chars', async () => {
      const msgs = await messagesOf(CreateJobOfferDto, {
        ...valid,
        title: 'short',
        description: 'too short',
      });
      expect(msgs).toEqual(
        expect.arrayContaining([
          'Title must be at least 10 characters long',
          'Description must be at least 30 characters long',
        ]),
      );
    });

    it('should reject invalid enums, dates, schedule and budgets', async () => {
      const msgs = await messagesOf(CreateJobOfferDto, {
        ...valid,
        careType: 'X',
        locationCity: '',
        locationZone: '',
        startDate: 'tomorrow',
        endDate: 'later',
        requiredSchedule: 'monday',
        budgetMin: -1,
        budgetMax: 'lots',
      });
      expect(msgs).toEqual(
        expect.arrayContaining([
          'careType must be a valid CareSpecialty enum value',
          'locationCity is required',
          'locationZone is required',
          'startDate must be a valid ISO date string',
          'endDate must be a valid ISO date string',
          'requiredSchedule must be an array of schedule slots',
        ]),
      );
    });
  });

  describe('UpdateJobOfferDto', () => {
    it('should allow an empty partial update', async () => {
      await expect(validate(UpdateJobOfferDto, {})).resolves.toBeDefined();
    });

    it('should validate every provided field', async () => {
      await expect(
        validate(UpdateJobOfferDto, {
          title: 'A longer valid title',
          description: 'd'.repeat(30),
          careType: CareSpecialty.CHILD_CARE,
          locationCity: 'Cali',
          locationZone: 'Norte',
          startDate: '2030-01-01',
          endDate: '2030-01-02',
          requiredSchedule: [slot],
          budgetMin: 1,
          budgetMax: 2,
        }),
      ).resolves.toBeDefined();

      const msgs = await messagesOf(UpdateJobOfferDto, {
        title: 'x',
        description: 'x',
        careType: 'X',
        locationCity: '',
        locationZone: '',
        startDate: 'x',
        endDate: 'x',
        requiredSchedule: 'x',
        budgetMin: 0,
        budgetMax: 0,
      });
      expect(msgs.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('UpdateJobOfferStatusDto (RF03.2.2)', () => {
    it('should only allow CLOSED or CANCELLED', async () => {
      await expect(
        validate(UpdateJobOfferStatusDto, { status: JobOfferStatus.CLOSED }),
      ).resolves.toBeDefined();
      await expect(
        validate(UpdateJobOfferStatusDto, { status: JobOfferStatus.CANCELLED }),
      ).resolves.toBeDefined();
      await messagesOf(UpdateJobOfferStatusDto, { status: JobOfferStatus.OPEN });
      await messagesOf(UpdateJobOfferStatusDto, {});
    });
  });

  describe('FilterJobOffersDto (RF04.2.2)', () => {
    it('should parse filters and defaults', async () => {
      const dto = await validate(
        FilterJobOffersDto,
        { city: 'Cali', careType: CareSpecialty.CHILD_CARE, minBudget: '100', maxBudget: '900' },
        'query',
      );
      expect(dto).toMatchObject({ city: 'Cali', minBudget: 100, maxBudget: 900, page: 1, limit: 10 });
    });

    it('should reject invalid careType and non-positive budgets', async () => {
      await messagesOf(FilterJobOffersDto, { careType: 'X' }, 'query');
      await messagesOf(FilterJobOffersDto, { minBudget: '0' }, 'query');
      await messagesOf(FilterJobOffersDto, { maxBudget: '-3' }, 'query');
    });
  });

  describe('Applications DTOs (RF04.3)', () => {
    it('should require a cover letter of >= 20 chars; proposedRate optional but positive', async () => {
      await expect(
        validate(ApplyJobOfferDto, { coverLetter: 'c'.repeat(20) }),
      ).resolves.toBeDefined();
      await expect(
        validate(ApplyJobOfferDto, { coverLetter: 'c'.repeat(20), proposedRate: 10 }),
      ).resolves.toBeDefined();
      await messagesOf(ApplyJobOfferDto, { coverLetter: 'short' });
      await messagesOf(ApplyJobOfferDto, { coverLetter: 'c'.repeat(20), proposedRate: -1 });
      await messagesOf(ApplyJobOfferDto, { coverLetter: 'c'.repeat(20), proposedRate: 'x' });
    });

    it('should only allow ACCEPTED or REJECTED status transitions', async () => {
      await expect(
        validate(UpdateApplicationStatusDto, { status: ApplicationStatus.ACCEPTED }),
      ).resolves.toBeDefined();
      await expect(
        validate(UpdateApplicationStatusDto, { status: ApplicationStatus.REJECTED }),
      ).resolves.toBeDefined();
      await messagesOf(UpdateApplicationStatusDto, { status: ApplicationStatus.PENDING });
    });
  });

  describe('Contact request DTOs (RF05.1)', () => {
    it('should require UUID caregiverId and message >= 15 chars', async () => {
      await expect(
        validate(CreateContactRequestDto, { caregiverId: UUID, initialMessage: 'm'.repeat(15) }),
      ).resolves.toBeDefined();
      const msgs = await messagesOf(CreateContactRequestDto, {
        caregiverId: 'not-a-uuid',
        initialMessage: 'hi',
      });
      expect(msgs).toEqual(
        expect.arrayContaining([
          'caregiverId must be a valid UUID',
          'Initial message must be at least 15 characters long',
        ]),
      );
    });

    it('should only allow ACCEPTED or REJECTED responses', async () => {
      await expect(
        validate(RespondContactRequestDto, { status: ContactRequestStatus.ACCEPTED }),
      ).resolves.toBeDefined();
      await expect(
        validate(RespondContactRequestDto, { status: ContactRequestStatus.REJECTED }),
      ).resolves.toBeDefined();
      await messagesOf(RespondContactRequestDto, { status: ContactRequestStatus.PENDING });
      await messagesOf(RespondContactRequestDto, {});
    });
  });

  describe('CreateReviewDto (RF06.1.4)', () => {
    it.each([1, 3, 5])('should accept rating %i', async (rating) => {
      await expect(
        validate(CreateReviewDto, { rating, comment: 'c'.repeat(15) }),
      ).resolves.toBeDefined();
    });

    it.each([0, 6, 2.5, -1])('should reject rating %p', async (rating) => {
      await messagesOf(CreateReviewDto, { rating, comment: 'c'.repeat(15) });
    });

    it('should enforce comment length 15..500', async () => {
      await messagesOf(CreateReviewDto, { rating: 4, comment: 'c'.repeat(14) });
      await messagesOf(CreateReviewDto, { rating: 4, comment: 'c'.repeat(501) });
      await expect(
        validate(CreateReviewDto, { rating: 4, comment: 'c'.repeat(500) }),
      ).resolves.toBeDefined();
    });
  });

  describe('Admin DTOs (RF07)', () => {
    it('should only allow APPROVED or REJECTED document status and cap notes length', async () => {
      await expect(
        validate(VerifyDocumentDto, { status: VerificationStatus.APPROVED }),
      ).resolves.toBeDefined();
      await expect(
        validate(VerifyDocumentDto, { status: VerificationStatus.REJECTED, adminNotes: 'blurry' }),
      ).resolves.toBeDefined();
      await messagesOf(VerifyDocumentDto, { status: VerificationStatus.PENDING });
      await messagesOf(VerifyDocumentDto, {
        status: VerificationStatus.REJECTED,
        adminNotes: 'n'.repeat(501),
      });
    });

    it('should require boolean isActive and cap suspensionReason', async () => {
      await expect(
        validate(UpdateUserStatusDto, { isActive: false, suspensionReason: 'abuse' }),
      ).resolves.toBeDefined();
      await expect(validate(UpdateUserStatusDto, { isActive: true })).resolves.toBeDefined();
      await messagesOf(UpdateUserStatusDto, { isActive: 'yes' });
      await messagesOf(UpdateUserStatusDto, {
        isActive: false,
        suspensionReason: 'r'.repeat(501),
      });
    });
  });

  describe('Bulk DTOs', () => {
    const validRegisterItem = {
      email: 'user@example.com',
      password: 'Password123',
      firstName: 'Maria',
      lastName: 'Lopez',
      phone: '+573001234567',
      role: UserRole.CLIENT,
    };

    const validOfferItem = {
      title: 'Elderly Care Assistant Needed',
      description: 'Need compassionate care assistance during weekdays.',
      careType: CareSpecialty.ELDERLY_CARE,
      locationCity: 'Bogota',
      locationZone: 'Chapinero',
      startDate: '2026-12-01',
      endDate: '2026-12-31',
      requiredSchedule: [{ day: DayOfWeek.MONDAY, shifts: [ShiftType.MORNING] }],
      budgetMin: 30,
      budgetMax: 50,
    };

    it('BulkRegisterDto: should validate users array bounds and elements', async () => {
      await expect(
        validate(BulkRegisterDto, { users: [validRegisterItem] }),
      ).resolves.toBeDefined();
      await messagesOf(BulkRegisterDto, { users: [] }); // Min size 1
      await messagesOf(BulkRegisterDto, { users: 'not-an-array' });
      await messagesOf(BulkRegisterDto, { users: [{ ...validRegisterItem, email: 'invalid-email' }] });
    });

    it('BulkCreateUsersDto: should validate users array and nested item attributes', async () => {
      await expect(
        validate(BulkCreateUsersDto, { users: [validRegisterItem] }),
      ).resolves.toBeDefined();
      await messagesOf(BulkCreateUsersDto, { users: [] });
      await messagesOf(BulkCreateUsersDto, { users: [{ ...validRegisterItem, role: 'SUPERUSER' }] });
      await messagesOf(BulkCreateUsersDto, { users: [{ ...validRegisterItem, password: 'short' }] });
    });

    it('BulkVerifyDocumentsDto: should validate items array and verification statuses', async () => {
      const validDocItem = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        status: VerificationStatus.APPROVED,
      };

      await expect(
        validate(BulkVerifyDocumentsDto, { items: [validDocItem] }),
      ).resolves.toBeDefined();
      await messagesOf(BulkVerifyDocumentsDto, { items: [] });
      await messagesOf(BulkVerifyDocumentsDto, {
        items: [{ id: 'not-uuid', status: VerificationStatus.APPROVED }],
      });
      await messagesOf(BulkVerifyDocumentsDto, {
        items: [{ id: validDocItem.id, status: VerificationStatus.PENDING }],
      });
      await messagesOf(BulkVerifyDocumentsDto, {
        items: [{ id: validDocItem.id, status: VerificationStatus.REJECTED, adminNotes: 'x'.repeat(501) }],
      });
    });

    it('BulkCreateJobOffersDto: should validate offers array bounds and nested elements', async () => {
      await expect(
        validate(BulkCreateJobOffersDto, { offers: [validOfferItem] }),
      ).resolves.toBeDefined();
      await messagesOf(BulkCreateJobOffersDto, { offers: [] });
      await messagesOf(BulkCreateJobOffersDto, { offers: 'not-array' });
      await messagesOf(BulkCreateJobOffersDto, {
        offers: [{ ...validOfferItem, title: 'short' }],
      });
    });
  });
});
