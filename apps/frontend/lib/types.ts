// ============================================================================
// CareConnect Domain Types & NestJS DTO/Response Contracts (/api/v1)
// Verified 1:1 against apps/backend/src/
// ============================================================================

export type UserRole = "CAREGIVER" | "CLIENT" | "ADMIN";

export type CareSpecialty =
  | "ELDERLY_CARE"
  | "COGNITIVE_DISABILITY"
  | "PHYSICAL_DISABILITY"
  | "CHILD_CARE";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ShiftType = "MORNING" | "AFTERNOON" | "NIGHT" | "FULL_TIME";

export type DocumentType =
  | "ID_CARD"
  | "CRIMINAL_RECORD"
  | "HEALTH_CERTIFICATE"
  | "ACADEMIC_DEGREE";

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type JobOfferStatus = "OPEN" | "CLOSED" | "CANCELLED";

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type ContactRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type CaregiverSortBy =
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "experience_desc";

export type HistoryLifecycleStatus = "SCHEDULED" | "ONGOING" | "COMPLETED";

export type HistoryStatusFilter = HistoryLifecycleStatus | "ALL";

/**
 * TypeORM `decimal` columns serialize as strings or numbers depending on query builder path.
 * Always pass through `toNumeric` / `toNullableNumeric` before arithmetic or formatting.
 */
export type DecimalValue = number | string;

export interface AvailabilitySlot {
  day: DayOfWeek;
  shifts: ShiftType[];
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  message: string | string[] | Record<string, unknown>;
  timestamp: string;
  path: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface MessageResponse {
  message: string;
}

// ----------------------------------------------------------------------------
// Auth & Users
// ----------------------------------------------------------------------------

export interface CaregiverDocument {
  id: string;
  caregiverProfileId: string;
  documentType: DocumentType;
  fileUrl: string;
  verificationStatus: VerificationStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicCaregiverDocument {
  id: string;
  documentType: DocumentType;
  fileUrl: string;
  verificationStatus: "APPROVED";
  createdAt: string;
}

export interface CaregiverProfile {
  id: string;
  userId: string;
  bio: string | null;
  yearsOfExperience: number;
  specialties: CareSpecialty[];
  hourlyRate: DecimalValue | null;
  dailyRate8h: DecimalValue | null;
  dailyRate12h: DecimalValue | null;
  overnightRate: DecimalValue | null;
  city: string | null;
  neighborhoods: string[];
  maxCoverageRadiusKm: number | null;
  availability: AvailabilitySlot[];
  ratingAverage: DecimalValue;
  totalReviews: number;
  isDocumentVerified: boolean;
  isPublic: boolean;
  documents?: CaregiverDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  suspensionReason: string | null;
  isTwoFactorEnabled: boolean;
  lastLogoutAt: string | null;
  caregiverProfile?: CaregiverProfile;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "CAREGIVER" | "CLIENT";
}

export interface BulkRegisterPayload {
  users: RegisterPayload[];
}

export interface BulkRegisterResponse {
  count: number;
  users: User[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginSuccessResponse {
  access_token: string;
  user: User;
}

export interface LoginTwoFactorChallengeResponse {
  isTwoFactorRequired: true;
  email: string;
  challengeToken: string;
  message: string;
}

export type LoginResponse = LoginSuccessResponse | LoginTwoFactorChallengeResponse;

export interface TwoFactorAuthenticatePayload {
  email: string;
  code: string;
  challengeToken?: string;
  password?: string;
}

export interface TwoFactorCodePayload {
  code: string;
}

export interface TwoFactorGenerateResponse {
  secret: string;
  otpauthUrl: string;
}

export interface TwoFactorToggleResponse {
  message: string;
  isTwoFactorEnabled: boolean;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// ----------------------------------------------------------------------------
// Caregivers
// ----------------------------------------------------------------------------

export interface PublicCaregiverSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  yearsOfExperience: number;
  specialties: CareSpecialty[];
  hourlyRate: DecimalValue | null;
  dailyRate8h: DecimalValue | null;
  dailyRate12h: DecimalValue | null;
  overnightRate: DecimalValue | null;
  city: string | null;
  neighborhoods: string[];
  maxCoverageRadiusKm: number | null;
  availability: AvailabilitySlot[];
  ratingAverage: DecimalValue;
  totalReviews: number;
  isDocumentVerified: boolean;
}

export interface PublicCaregiverDetail extends PublicCaregiverSummary {
  documents: PublicCaregiverDocument[];
}

export interface SearchCaregiversParams {
  specialty?: CareSpecialty;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlyVerified?: boolean;
  sortBy?: CaregiverSortBy;
  page?: number;
  limit?: number;
}

export interface UpdateCaregiverProfilePayload {
  bio?: string;
  yearsOfExperience?: number;
  specialties?: CareSpecialty[];
  hourlyRate?: number;
  dailyRate8h?: number;
  dailyRate12h?: number;
  overnightRate?: number;
  city?: string;
  neighborhoods?: string[];
  maxCoverageRadiusKm?: number;
  availability?: AvailabilitySlot[];
}

// ----------------------------------------------------------------------------
// Job Offers & Applications
// ----------------------------------------------------------------------------

export interface JobOffer {
  id: string;
  clientId: string;
  title: string;
  description: string;
  careType: CareSpecialty;
  locationCity: string;
  locationZone: string;
  startDate: string;
  endDate: string;
  requiredSchedule: AvailabilitySlot[];
  budgetMin: DecimalValue;
  budgetMax: DecimalValue;
  status: JobOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MyJobOfferItem extends JobOffer {
  applicationsCount: number;
}

export interface FilterJobOffersParams {
  city?: string;
  careType?: CareSpecialty;
  minBudget?: number;
  maxBudget?: number;
  page?: number;
  limit?: number;
}

export interface CreateJobOfferPayload {
  title: string;
  description: string;
  careType: CareSpecialty;
  locationCity: string;
  locationZone: string;
  startDate: string;
  endDate: string;
  requiredSchedule: AvailabilitySlot[];
  budgetMin: number;
  budgetMax: number;
}

export interface BulkCreateJobOffersPayload {
  offers: CreateJobOfferPayload[];
}

export interface BulkCreateJobOffersResponse {
  count: number;
  jobOffers: JobOffer[];
}

export type UpdateJobOfferPayload = Partial<CreateJobOfferPayload>;

export interface UpdateJobOfferStatusPayload {
  status: "CLOSED" | "CANCELLED";
}

export interface ApplyJobOfferPayload {
  coverLetter: string;
  proposedRate?: number;
}

export interface Application {
  id: string;
  jobOfferId: string;
  caregiverId: string;
  coverLetter: string;
  proposedRate: DecimalValue | null;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
}

export interface JobOfferApplicationItem {
  id: string;
  jobOfferId: string;
  coverLetter: string;
  proposedRate: DecimalValue | null;
  status: ApplicationStatus;
  appliedAt: string;
  caregiver: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface MyApplicationItem extends Application {
  jobOffer: JobOffer;
}

export interface UnlockedPersonContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappUrl: string;
}

export interface UnlockedContactDetails {
  client: UnlockedPersonContact;
  caregiver: UnlockedPersonContact;
}

export interface UpdateApplicationStatusPayload {
  status: "ACCEPTED" | "REJECTED";
}

export interface UpdateApplicationStatusResponse {
  application: Application;
  unlockedContactDetails?: UnlockedContactDetails;
}

// ----------------------------------------------------------------------------
// Contact Requests
// ----------------------------------------------------------------------------

export interface ContactRequest {
  id: string;
  clientId: string;
  caregiverId: string;
  initialMessage: string;
  status: ContactRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequestPayload {
  /** Must be User.id (`profile.userId`), NOT CaregiverProfile.id */
  caregiverId: string;
  initialMessage: string;
}

export interface ContactRequestParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsappUrl?: string;
}

export interface FormattedContactRequest {
  id: string;
  clientId: string;
  caregiverId: string;
  initialMessage: string;
  status: ContactRequestStatus;
  respondedAt: string | null;
  createdAt: string;
  participant: ContactRequestParticipant;
}

export interface RespondContactRequestPayload {
  status: "ACCEPTED" | "REJECTED";
}

export interface RespondContactRequestResponse {
  contactRequest: ContactRequest;
  unlockedContactDetails?: UnlockedContactDetails;
}

// ----------------------------------------------------------------------------
// Reviews
// ----------------------------------------------------------------------------

export interface ReviewItem {
  id: string;
  caregiverId: string;
  rating: number;
  comment: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateReviewPayload {
  rating: number;
  comment: string;
}

export interface Review {
  id: string;
  caregiverId: string;
  clientId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// History
// ----------------------------------------------------------------------------

export interface EngagementDuration {
  startDate: string;
  endDate: string;
  durationDays: number;
  durationFormatted: string;
  status: HistoryLifecycleStatus;
}

export interface QueryHistoryParams {
  careType?: CareSpecialty;
  status?: HistoryStatusFilter;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  limit?: number;
}

export interface ClientHistoryItem {
  contractId: string;
  jobOfferId: string;
  offerTitle: string;
  careType: CareSpecialty;
  location: {
    city: string;
    zone: string;
  };
  timeframe: EngagementDuration;
  agreedRate: DecimalValue | null;
  schedule: AvailabilitySlot[];
  caregiver: {
    id: string;
    firstName: string;
    lastName: string;
    ratingAverage: number;
    totalReviews: number;
    specialties: CareSpecialty[];
    yearsOfExperience: number;
    bio: string | null;
    isDocumentVerified: boolean;
  };
}

export interface CaregiverHistoryItem {
  contractId: string;
  jobOfferId: string;
  offerTitle: string;
  careType: CareSpecialty;
  timeframe: EngagementDuration;
  agreedRate: DecimalValue | null;
  schedule: AvailabilitySlot[];
  client: {
    id: string;
    firstName: string;
    lastName: string;
    city: string;
    zone: string;
  };
}

// ----------------------------------------------------------------------------
// Reports (Admin)
// ----------------------------------------------------------------------------

export interface ModalitySubcategoryReport {
  careType: CareSpecialty;
  totalOffers: number;
  acceptedOffers: number;
}

export interface ModalityCategoryReport {
  category: string;
  label: string;
  totalOffers: number;
  acceptedOffers: number;
  fulfillmentRate: number;
  averageBudgetMin: number;
  averageBudgetMax: number;
  marketSharePercentage: number;
  availableCaregiversCount: number;
  subcategories?: ModalitySubcategoryReport[];
}

export interface ClientModalityReportResponse {
  totalOffers: number;
  totalAcceptedServices: number;
  categories: ModalityCategoryReport[];
}

export interface FilterModalityReportParams {
  startDate?: string;
  endDate?: string;
  city?: string;
}

export interface ZoneItemReport {
  rank: number;
  city: string;
  zone: string;
  totalOffers: number;
  completedServices: number;
  fulfillmentRate: number;
  percentageOfTotalServed: number;
}

export interface TopZonesReportResponse {
  mostServedZone: {
    city: string;
    zone: string;
    completedServices: number;
  } | null;
  totalCompletedServices: number;
  zones: ZoneItemReport[];
}

export interface FilterZoneReportParams {
  city?: string;
  careType?: CareSpecialty;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface ExecutiveSummaryResponse {
  totalJobOffers: number;
  totalHiredServices: number;
  predominantModality: string | null;
  topServedZone: {
    city: string;
    zone: string;
    completedServices: number;
  } | null;
  modalityBreakdown: Array<{
    category: string;
    totalOffers: number;
    sharePercentage: number;
  }>;
  topFiveZones: ZoneItemReport[];
}

// ----------------------------------------------------------------------------
// Admin
// ----------------------------------------------------------------------------

export interface PendingDocumentItem {
  id: string;
  caregiverProfileId: string;
  documentType: DocumentType;
  fileUrl: string;
  verificationStatus: VerificationStatus;
  adminNotes: string | null;
  createdAt: string;
  caregiver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    city: string | null;
  };
}

export interface VerifyDocumentPayload {
  status: "APPROVED" | "REJECTED";
  adminNotes?: string;
}

export interface BulkVerifyDocumentItem {
  id: string;
  status: "APPROVED" | "REJECTED";
  adminNotes?: string;
}

export interface BulkVerifyDocumentsPayload {
  items: BulkVerifyDocumentItem[];
}

export interface BulkVerifyDocumentsResponse {
  count: number;
  documents: CaregiverDocument[];
}

export interface AdminCreateUserItem {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
}

export interface BulkCreateUsersPayload {
  users: AdminCreateUserItem[];
}

export interface BulkCreateUsersResponse {
  count: number;
  users: User[];
}

export interface UpdateUserStatusPayload {
  isActive: boolean;
  suspensionReason?: string;
}

export interface UpdateUserRolePayload {
  role: UserRole;
}

export interface AdminSeedResponse {
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
}

export interface TrackedAdminUserRecord {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  suspensionReason?: string | null;
  source: "bulk_create" | "pending_docs" | "caregiver_search" | "manual_lookup";
  updatedAt: string;
}
