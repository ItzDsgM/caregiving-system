import {
  ADMIN_USER_REGISTRY_KEY,
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_STORAGE_KEY,
} from "./constants";
import type {
  AdminSeedResponse,
  ApiErrorEnvelope,
  Application,
  ApplyJobOfferPayload,
  BulkCreateJobOffersPayload,
  BulkCreateJobOffersResponse,
  BulkCreateUsersPayload,
  BulkCreateUsersResponse,
  BulkRegisterPayload,
  BulkRegisterResponse,
  BulkVerifyDocumentsPayload,
  BulkVerifyDocumentsResponse,
  CaregiverDocument,
  CaregiverProfile,
  ClientHistoryItem,
  ClientModalityReportResponse,
  CaregiverHistoryItem,
  ContactRequest,
  CreateContactRequestPayload,
  CreateJobOfferPayload,
  CreateReviewPayload,
  DocumentType,
  ExecutiveSummaryResponse,
  FilterJobOffersParams,
  FilterModalityReportParams,
  FilterZoneReportParams,
  ForgotPasswordPayload,
  FormattedContactRequest,
  JobOffer,
  JobOfferApplicationItem,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  MessageResponse,
  MyApplicationItem,
  MyJobOfferItem,
  PaginatedResponse,
  PendingDocumentItem,
  PublicCaregiverDetail,
  PublicCaregiverSummary,
  QueryHistoryParams,
  RegisterPayload,
  ResetPasswordPayload,
  RespondContactRequestPayload,
  RespondContactRequestResponse,
  Review,
  ReviewItem,
  SearchCaregiversParams,
  TopZonesReportResponse,
  TrackedAdminUserRecord,
  TwoFactorAuthenticatePayload,
  TwoFactorCodePayload,
  TwoFactorGenerateResponse,
  TwoFactorToggleResponse,
  UpdateApplicationStatusPayload,
  UpdateApplicationStatusResponse,
  UpdateCaregiverProfilePayload,
  UpdateJobOfferPayload,
  UpdateJobOfferStatusPayload,
  UpdateUserPayload,
  UpdateUserRolePayload,
  UpdateUserStatusPayload,
  User,
  VerifyDocumentPayload,
} from "./types";

/**
 * Base API client configuration for CareConnect Frontend.
 * Points to the CareConnect NestJS backend (/api/v1).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export class ApiError extends Error {
  statusCode: number;
  timestamp?: string;
  path?: string;
  rawMessage: string | string[] | Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    rawMessage: string | string[] | Record<string, unknown>,
    timestamp?: string,
    path?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.rawMessage = rawMessage;
    this.timestamp = timestamp;
    this.path = path;
  }
}

export function extractErrorMessage(
  rawMessage: string | string[] | Record<string, unknown> | undefined,
  fallbackStatus: number,
): string {
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    return rawMessage;
  }
  if (Array.isArray(rawMessage) && rawMessage.length > 0) {
    return rawMessage.filter((item) => typeof item === "string").join(". ");
  }
  if (rawMessage && typeof rawMessage === "object" && "message" in rawMessage) {
    const inner = (rawMessage as { message?: unknown }).message;
    if (typeof inner === "string" && inner.trim().length > 0) {
      return inner;
    }
    if (Array.isArray(inner) && inner.length > 0) {
      return inner.filter((item) => typeof item === "string").join(". ");
    }
  }
  return `Error en la solicitud (HTTP ${fallbackStatus})`;
}

type UnauthorizedHandler = (path: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function getBrowserAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const cookieMatch = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (cookieMatch) {
      const value = decodeURIComponent(cookieMatch.slice(AUTH_COOKIE_NAME.length + 1));
      if (value) return value;
    }
  } catch {
    // Ignore cookie read error
  }

  try {
    const sessionToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (sessionToken) return sessionToken;
    const localToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (localToken) return localToken;
  } catch {
    // Ignore storage error
  }

  return null;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
  skipUnauthorizedRedirect?: boolean;
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchFromApi<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body,
    token,
    skipAuth = false,
    skipUnauthorizedRedirect = false,
    headers: customHeaders,
    ...fetchInit
  } = options;

  const cleanPath = endpoint.replace(/^\/+/, "");
  const url = `${API_BASE_URL.replace(/\/+$/, "")}/${cleanPath}`;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const resolvedHeaders = new Headers(customHeaders);

  if (!isFormData && body !== undefined && !resolvedHeaders.has("Content-Type")) {
    resolvedHeaders.set("Content-Type", "application/json");
  }

  const authToken = skipAuth ? null : (token ?? getBrowserAuthToken());
  if (authToken && !resolvedHeaders.has("Authorization")) {
    resolvedHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const requestBody: BodyInit | undefined =
    body === undefined
      ? undefined
      : isFormData
        ? (body as FormData)
        : typeof body === "string"
          ? body
          : JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchInit,
      headers: resolvedHeaders,
      body: requestBody,
    });
  } catch (networkErr) {
    const message =
      networkErr instanceof Error && networkErr.message
        ? `No se pudo conectar con el servidor (${networkErr.message})`
        : "No se pudo conectar con el servidor de CareConnect";
    throw new ApiError(0, message, message, new Date().toISOString(), cleanPath);
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as Partial<ApiErrorEnvelope> | null;
    const rawMsg = errorBody?.message ?? `Error HTTP ${response.status}`;
    const friendlyMessage = extractErrorMessage(rawMsg, response.status);

    if (
      response.status === 401 &&
      !skipUnauthorizedRedirect &&
      authToken &&
      unauthorizedHandler
    ) {
      unauthorizedHandler(cleanPath);
    }

    throw new ApiError(
      errorBody?.statusCode ?? response.status,
      friendlyMessage,
      rawMsg,
      errorBody?.timestamp,
      errorBody?.path ?? `/${cleanPath}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

// ============================================================================
// Domain API Clients (1:1 with NestJS endpoints)
// ============================================================================

export const authApi = {
  register: (payload: RegisterPayload) =>
    fetchFromApi<User>("/auth/register", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  bulkRegister: (payload: BulkRegisterPayload) =>
    fetchFromApi<BulkRegisterResponse>("/auth/bulk-register", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  login: (payload: LoginPayload) =>
    fetchFromApi<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      skipAuth: true,
      skipUnauthorizedRedirect: true,
    }),

  authenticateTwoFactor: (payload: TwoFactorAuthenticatePayload) =>
    fetchFromApi<LoginSuccessResponse>("/auth/2fa/authenticate", {
      method: "POST",
      body: payload,
      skipAuth: true,
      skipUnauthorizedRedirect: true,
    }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    fetchFromApi<MessageResponse>("/auth/forgot-password", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  resetPassword: (payload: ResetPasswordPayload) =>
    fetchFromApi<MessageResponse>("/auth/reset-password", {
      method: "POST",
      body: payload,
      skipAuth: true,
    }),

  generateTwoFactorSecret: () =>
    fetchFromApi<TwoFactorGenerateResponse>("/auth/2fa/generate", {
      method: "POST",
      body: {},
    }),

  enableTwoFactor: (payload: TwoFactorCodePayload) =>
    fetchFromApi<TwoFactorToggleResponse>("/auth/2fa/enable", {
      method: "POST",
      body: payload,
    }),

  disableTwoFactor: (payload: TwoFactorCodePayload) =>
    fetchFromApi<TwoFactorToggleResponse>("/auth/2fa/disable", {
      method: "POST",
      body: payload,
    }),

  logout: () =>
    fetchFromApi<MessageResponse>("/auth/logout", {
      method: "POST",
      body: {},
      skipUnauthorizedRedirect: true,
    }),
};

export const usersApi = {
  getMe: () => fetchFromApi<User>("/users/me"),

  updateMe: (payload: UpdateUserPayload) =>
    fetchFromApi<User>("/users/me", {
      method: "PATCH",
      body: payload,
    }),

  deleteMe: () =>
    fetchFromApi<MessageResponse>("/users/me", {
      method: "DELETE",
    }),
};

export const caregiversApi = {
  search: (params: SearchCaregiversParams = {}) => {
    // Strip zero/false values that would violate @IsPositive() or pollute querystrings
    const sanitized: Record<string, string | number | boolean | undefined> = {
      specialty: params.specialty || undefined,
      city: params.city?.trim() || undefined,
      minPrice: params.minPrice && params.minPrice > 0 ? params.minPrice : undefined,
      maxPrice: params.maxPrice && params.maxPrice > 0 ? params.maxPrice : undefined,
      minRating: params.minRating && params.minRating > 0 ? params.minRating : undefined,
      onlyVerified: params.onlyVerified ? true : undefined,
      sortBy: params.sortBy || undefined,
      page: params.page,
      limit: params.limit,
    };
    return fetchFromApi<PaginatedResponse<PublicCaregiverSummary>>(
      `/caregivers/search${buildQueryString(sanitized)}`,
      { skipAuth: true },
    );
  },

  getPublicProfile: (id: string) =>
    fetchFromApi<PublicCaregiverDetail>(`/caregivers/${id}`, { skipAuth: true }),

  getMe: () => fetchFromApi<CaregiverProfile>("/caregivers/me"),

  updateMe: (payload: UpdateCaregiverProfilePayload) =>
    fetchFromApi<CaregiverProfile>("/caregivers/me", {
      method: "PATCH",
      body: payload,
    }),

  uploadDocument: (file: File, documentType: DocumentType, token?: string | null) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    return fetchFromApi<CaregiverDocument>("/caregivers/me/documents", {
      method: "POST",
      body: formData,
      token,
    });
  },

  deleteDocument: (documentId: string) =>
    fetchFromApi<MessageResponse>(`/caregivers/me/documents/${documentId}`, {
      method: "DELETE",
    }),
};

export const jobOffersApi = {
  listPublic: (params: FilterJobOffersParams = {}) => {
    const sanitized: Record<string, string | number | undefined> = {
      city: params.city?.trim() || undefined,
      careType: params.careType || undefined,
      minBudget: params.minBudget && params.minBudget > 0 ? params.minBudget : undefined,
      maxBudget: params.maxBudget && params.maxBudget > 0 ? params.maxBudget : undefined,
      page: params.page,
      limit: params.limit,
    };
    return fetchFromApi<PaginatedResponse<JobOffer>>(
      `/job-offers${buildQueryString(sanitized)}`,
      { skipAuth: true },
    );
  },

  getById: (id: string) =>
    fetchFromApi<JobOffer>(`/job-offers/${id}`, { skipAuth: true }),

  create: (payload: CreateJobOfferPayload) =>
    fetchFromApi<JobOffer>("/job-offers", {
      method: "POST",
      body: payload,
    }),

  bulkCreate: (payload: BulkCreateJobOffersPayload) =>
    fetchFromApi<BulkCreateJobOffersResponse>("/job-offers/bulk", {
      method: "POST",
      body: payload,
    }),

  getMyOffers: () => fetchFromApi<MyJobOfferItem[]>("/job-offers/my-offers"),

  update: (id: string, payload: UpdateJobOfferPayload) =>
    fetchFromApi<JobOffer>(`/job-offers/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  updateStatus: (id: string, payload: UpdateJobOfferStatusPayload) =>
    fetchFromApi<JobOffer>(`/job-offers/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),

  apply: (jobOfferId: string, payload: ApplyJobOfferPayload) =>
    fetchFromApi<Application>(`/job-offers/${jobOfferId}/apply`, {
      method: "POST",
      body: payload,
    }),

  getApplications: (jobOfferId: string) =>
    fetchFromApi<JobOfferApplicationItem[]>(`/job-offers/${jobOfferId}/applications`),
};

export const applicationsApi = {
  updateStatus: (applicationId: string, payload: UpdateApplicationStatusPayload) =>
    fetchFromApi<UpdateApplicationStatusResponse>(
      `/applications/${applicationId}/status`,
      {
        method: "PATCH",
        body: payload,
      },
    ),

  getMyApplications: () =>
    fetchFromApi<MyApplicationItem[]>("/applications/my-applications"),
};

export const contactRequestsApi = {
  create: (payload: CreateContactRequestPayload) =>
    fetchFromApi<ContactRequest>("/contact-requests", {
      method: "POST",
      body: payload,
    }),

  getReceived: () =>
    fetchFromApi<FormattedContactRequest[]>("/contact-requests/received"),

  getSent: () =>
    fetchFromApi<FormattedContactRequest[]>("/contact-requests/sent"),

  getById: (id: string) =>
    fetchFromApi<FormattedContactRequest>(`/contact-requests/${id}`),

  respond: (id: string, payload: RespondContactRequestPayload) =>
    fetchFromApi<RespondContactRequestResponse>(`/contact-requests/${id}/respond`, {
      method: "PATCH",
      body: payload,
    }),
};

export const reviewsApi = {
  getByCaregiver: (caregiverUserId: string, page = 1, limit = 10) =>
    fetchFromApi<PaginatedResponse<ReviewItem>>(
      `/caregivers/${caregiverUserId}/reviews${buildQueryString({ page, limit })}`,
      { skipAuth: true },
    ),

  create: (caregiverUserId: string, payload: CreateReviewPayload) =>
    fetchFromApi<Review>(`/caregivers/${caregiverUserId}/reviews`, {
      method: "POST",
      body: payload,
    }),
};

export const historyApi = {
  getClientHistory: (params: QueryHistoryParams = {}) =>
    fetchFromApi<PaginatedResponse<ClientHistoryItem>>(
      `/history/client${buildQueryString({ ...params })}`,
    ),

  getCaregiverHistory: (params: QueryHistoryParams = {}) =>
    fetchFromApi<PaginatedResponse<CaregiverHistoryItem>>(
      `/history/caregiver${buildQueryString({ ...params })}`,
    ),

  getMyHistory: (params: QueryHistoryParams = {}) =>
    fetchFromApi<PaginatedResponse<ClientHistoryItem | CaregiverHistoryItem>>(
      `/history/my-history${buildQueryString({ ...params })}`,
    ),
};

export const reportsApi = {
  getSummary: () => fetchFromApi<ExecutiveSummaryResponse>("/reports/summary"),

  getClientModality: (params: FilterModalityReportParams = {}) =>
    fetchFromApi<ClientModalityReportResponse>(
      `/reports/client-modality${buildQueryString({ ...params })}`,
    ),

  getTopZones: (params: FilterZoneReportParams = {}) =>
    fetchFromApi<TopZonesReportResponse>(
      `/reports/top-zones${buildQueryString({ ...params })}`,
    ),
};

export const adminApi = {
  getPendingDocuments: () =>
    fetchFromApi<PendingDocumentItem[]>("/admin/documents/pending"),

  verifyDocument: (id: string, payload: VerifyDocumentPayload) =>
    fetchFromApi<CaregiverDocument>(`/admin/documents/${id}/verify`, {
      method: "PATCH",
      body: payload,
    }),

  bulkVerifyDocuments: (payload: BulkVerifyDocumentsPayload) =>
    fetchFromApi<BulkVerifyDocumentsResponse>("/admin/documents/bulk-verify", {
      method: "PATCH",
      body: payload,
    }),

  bulkCreateUsers: async (payload: BulkCreateUsersPayload) => {
    const res = await fetchFromApi<BulkCreateUsersResponse>("/admin/users/bulk", {
      method: "POST",
      body: payload,
    });
    if (res?.users?.length) {
      upsertAdminUsersRegistry(
        res.users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          suspensionReason: user.suspensionReason,
          source: "bulk_create" as const,
          updatedAt: user.updatedAt || new Date().toISOString(),
        })),
      );
    }
    return res;
  },

  updateUserStatus: async (userId: string, payload: UpdateUserStatusPayload) => {
    const updated = await fetchFromApi<User>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: payload,
    });
    upsertAdminUsersRegistry([
      {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.isActive,
        suspensionReason: updated.suspensionReason,
        source: "manual_lookup",
        updatedAt: updated.updatedAt || new Date().toISOString(),
      },
    ]);
    return updated;
  },

  updateUserRole: async (userId: string, payload: UpdateUserRolePayload) => {
    const updated = await fetchFromApi<User>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: payload,
    });
    upsertAdminUsersRegistry([
      {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phone: updated.phone,
        role: updated.role,
        isActive: updated.isActive,
        suspensionReason: updated.suspensionReason,
        source: "manual_lookup",
        updatedAt: updated.updatedAt || new Date().toISOString(),
      },
    ]);
    return updated;
  },

  seedDatabase: () =>
    fetchFromApi<AdminSeedResponse>("/admin/seed", {
      method: "POST",
      body: {},
    }),
};

// ============================================================================
// Admin Local User Registry Helpers
// (Supports /admin/users since backend exposes mutations + bulk create but no GET /admin/users)
// ============================================================================

export function getAdminUsersRegistry(): TrackedAdminUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ADMIN_USER_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as TrackedAdminUserRecord[]) : [];
  } catch {
    return [];
  }
}

export function upsertAdminUsersRegistry(
  records: TrackedAdminUserRecord[],
): TrackedAdminUserRecord[] {
  if (typeof window === "undefined") return records;
  const existing = getAdminUsersRegistry();
  const map = new Map<string, TrackedAdminUserRecord>();

  for (const item of existing) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of records) {
    if (!item?.id) continue;
    const prev = map.get(item.id);
    map.set(item.id, {
      ...prev,
      ...item,
      email: item.email ?? prev?.email,
      firstName: item.firstName ?? prev?.firstName,
      lastName: item.lastName ?? prev?.lastName,
      phone: item.phone ?? prev?.phone,
    });
  }

  const merged = Array.from(map.values()).sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );

  try {
    window.localStorage.setItem(ADMIN_USER_REGISTRY_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota issues
  }
  return merged;
}

export async function discoverAdminUsersFromSources(): Promise<TrackedAdminUserRecord[]> {
  const discovered: TrackedAdminUserRecord[] = [];
  const now = new Date().toISOString();

  const [pendingDocsResult, caregiversResult] = await Promise.allSettled([
    adminApi.getPendingDocuments(),
    caregiversApi.search({ limit: 50 }),
  ]);

  if (pendingDocsResult.status === "fulfilled") {
    for (const doc of pendingDocsResult.value) {
      if (doc.caregiver?.id) {
        discovered.push({
          id: doc.caregiver.id,
          email: doc.caregiver.email,
          firstName: doc.caregiver.firstName,
          lastName: doc.caregiver.lastName,
          role: "CAREGIVER",
          isActive: true,
          source: "pending_docs",
          updatedAt: doc.createdAt || now,
        });
      }
    }
  }

  if (caregiversResult.status === "fulfilled") {
    for (const cg of caregiversResult.value.data) {
      if (cg.userId) {
        discovered.push({
          id: cg.userId,
          firstName: cg.firstName,
          lastName: cg.lastName,
          role: "CAREGIVER",
          isActive: true,
          source: "caregiver_search",
          updatedAt: now,
        });
      }
    }
  }

  return upsertAdminUsersRegistry(discovered);
}
