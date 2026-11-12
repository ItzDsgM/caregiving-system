import { REQUIRED_VERIFICATION_DOC_TYPES } from '@/lib/constants';
import type {
  CaregiverDocument,
  CaregiverProfile,
  DocumentType,
  FormattedContactRequest,
  RespondContactRequestResponse,
  VerificationStatus,
} from '@/lib/types';

export type RequiredDocChecklistStatus = VerificationStatus | 'MISSING';

export type RequiredVerificationDocType = 'ID_CARD' | 'CRIMINAL_RECORD';

export interface VerificationProgressSummary {
  requiredStatuses: Record<
    RequiredVerificationDocType,
    RequiredDocChecklistStatus
  >;
  approvedRequiredCount: number;
  uploadedRequiredCount: number;
  pendingRequiredCount: number;
  rejectedRequiredCount: number;
  totalRequiredCount: number;
  optionalApprovedCount: number;
}

function resolveDocTypeStatus(
  docs: CaregiverDocument[],
  docType: DocumentType,
): RequiredDocChecklistStatus {
  const matching = docs.filter((doc) => doc.documentType === docType);
  if (matching.length === 0) return 'MISSING';
  if (matching.some((doc) => doc.verificationStatus === 'APPROVED')) {
    return 'APPROVED';
  }
  if (matching.some((doc) => doc.verificationStatus === 'PENDING')) {
    return 'PENDING';
  }
  return 'REJECTED';
}

/**
 * Computes checklist status for required verification documents (ID_CARD, CRIMINAL_RECORD)
 * and counts optional approved documents.
 */
export function getVerificationProgress(
  profile: CaregiverProfile | null,
): VerificationProgressSummary {
  const docs = profile?.documents ?? [];
  const idCardStatus = resolveDocTypeStatus(docs, 'ID_CARD');
  const criminalRecordStatus = resolveDocTypeStatus(docs, 'CRIMINAL_RECORD');

  const statuses = [idCardStatus, criminalRecordStatus];
  const approvedRequiredCount = statuses.filter((s) => s === 'APPROVED').length;
  const uploadedRequiredCount = statuses.filter((s) => s !== 'MISSING').length;
  const pendingRequiredCount = statuses.filter((s) => s === 'PENDING').length;
  const rejectedRequiredCount = statuses.filter((s) => s === 'REJECTED').length;

  const optionalDocs = docs.filter(
    (doc) =>
      doc.documentType === 'HEALTH_CERTIFICATE' ||
      doc.documentType === 'ACADEMIC_DEGREE',
  );
  const optionalApprovedCount = optionalDocs.filter(
    (doc) => doc.verificationStatus === 'APPROVED',
  ).length;

  return {
    requiredStatuses: {
      ID_CARD: idCardStatus,
      CRIMINAL_RECORD: criminalRecordStatus,
    },
    approvedRequiredCount,
    uploadedRequiredCount,
    pendingRequiredCount,
    rejectedRequiredCount,
    totalRequiredCount: REQUIRED_VERIFICATION_DOC_TYPES.length,
    optionalApprovedCount,
  };
}

export function getProfileMissingFields(profile: CaregiverProfile | null): string[] {
  if (!profile) return [];
  const missing: string[] = [];
  if (!profile.hourlyRate || Number(profile.hourlyRate) <= 0) {
    missing.push('tarifa por hora');
  }
  if (!profile.city?.trim()) {
    missing.push('ciudad');
  }
  if (!profile.specialties || profile.specialties.length === 0) {
    missing.push('especialidades');
  }
  if (!profile.bio || profile.bio.trim().length < 50) {
    missing.push('biografía profesional');
  }
  if (!profile.availability || profile.availability.length === 0) {
    missing.push('disponibilidad horaria');
  }
  return missing;
}

const INQUIRY_STATUS_PRIORITY: Record<FormattedContactRequest['status'], number> = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
};

/**
 * Sorts received inquiries so PENDING items always appear first,
 * followed by newest responded/created items.
 */
export function sortInquiriesByPriority(
  items: ReadonlyArray<FormattedContactRequest>,
): FormattedContactRequest[] {
  return [...items].sort((a, b) => {
    const rankDiff =
      INQUIRY_STATUS_PRIORITY[a.status] - INQUIRY_STATUS_PRIORITY[b.status];
    if (rankDiff !== 0) return rankDiff;
    const dateA = a.respondedAt || a.createdAt || '';
    const dateB = b.respondedAt || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });
}

/**
 * Merges a contact-request response (including unlocked client contact details on ACCEPTED)
 * into the local inquiries list immediately without requiring a full page reload.
 */
export function applyInquiryResponseUpdate(
  list: ReadonlyArray<FormattedContactRequest>,
  inquiryId: string,
  response: RespondContactRequestResponse,
): FormattedContactRequest[] {
  return list.map((item) => {
    if (item.id !== inquiryId) return item;
    const unlockedClient = response.unlockedContactDetails?.client;
    return {
      ...item,
      status: response.contactRequest.status,
      respondedAt: response.contactRequest.respondedAt,
      participant:
        response.contactRequest.status === 'ACCEPTED' && unlockedClient
          ? {
              ...item.participant,
              firstName: unlockedClient.firstName || item.participant.firstName,
              lastName: unlockedClient.lastName || item.participant.lastName,
              email: unlockedClient.email,
              phone: unlockedClient.phone,
              whatsappUrl: unlockedClient.whatsappUrl,
            }
          : item.participant,
    };
  });
}
