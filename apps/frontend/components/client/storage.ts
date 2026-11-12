'use client';

import { useSyncExternalStore } from 'react';
import type { UnlockedContactDetails } from '@/lib/types';

const UNLOCKED_APP_CONTACTS_KEY = 'cc_client_unlocked_app_contacts';
const REVIEWED_CAREGIVERS_KEY = 'cc_client_reviewed_caregivers';
const STORAGE_CHANGE_EVENT = 'cc-client-storage-change';

export interface StoredReviewRecord {
  rating: number;
  createdAt: string;
}

type UnlockedContactMap = Record<string, UnlockedContactDetails>;
type ReviewedCaregiverMap = Record<string, StoredReviewRecord>;

let lastContactsRaw: string | null = null;
let lastContactsParsed: UnlockedContactMap = {};

let lastReviewsRaw: string | null = null;
let lastReviewsParsed: ReviewedCaregiverMap = {};

const EMPTY_CONTACTS: UnlockedContactMap = {};
const EMPTY_REVIEWS: ReviewedCaregiverMap = {};

function emitStorageChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
  }
}

function subscribeStorage(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustom = () => onStoreChange();
  const handleNative = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === UNLOCKED_APP_CONTACTS_KEY ||
      event.key === REVIEWED_CAREGIVERS_KEY
    ) {
      onStoreChange();
    }
  };

  window.addEventListener(STORAGE_CHANGE_EVENT, handleCustom);
  window.addEventListener('storage', handleNative);

  return () => {
    window.removeEventListener(STORAGE_CHANGE_EVENT, handleCustom);
    window.removeEventListener('storage', handleNative);
  };
}

function getUnlockedContactsSnapshot(): UnlockedContactMap {
  if (typeof window === 'undefined') {
    return EMPTY_CONTACTS;
  }
  try {
    const raw = window.sessionStorage.getItem(UNLOCKED_APP_CONTACTS_KEY);
    if (!raw) {
      lastContactsRaw = null;
      lastContactsParsed = EMPTY_CONTACTS;
      return EMPTY_CONTACTS;
    }
    if (raw === lastContactsRaw) {
      return lastContactsParsed;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      lastContactsRaw = raw;
      lastContactsParsed = parsed as UnlockedContactMap;
      return lastContactsParsed;
    }
  } catch {
    // Ignore storage read/parse errors
  }
  return EMPTY_CONTACTS;
}

function getUnlockedContactsServerSnapshot(): UnlockedContactMap {
  return EMPTY_CONTACTS;
}

export function useUnlockedAppContacts(): UnlockedContactMap {
  return useSyncExternalStore(
    subscribeStorage,
    getUnlockedContactsSnapshot,
    getUnlockedContactsServerSnapshot,
  );
}

export function saveUnlockedAppContact(
  applicationId: string,
  details: UnlockedContactDetails,
): void {
  if (typeof window === 'undefined' || !applicationId) {
    return;
  }
  try {
    const current = getUnlockedContactsSnapshot();
    const next: UnlockedContactMap = {
      ...current,
      [applicationId]: details,
    };
    const serialized = JSON.stringify(next);
    window.sessionStorage.setItem(UNLOCKED_APP_CONTACTS_KEY, serialized);
    lastContactsRaw = serialized;
    lastContactsParsed = next;
    emitStorageChange();
  } catch {
    // Ignore storage quota issues
  }
}

function getReviewedCaregiversSnapshot(): ReviewedCaregiverMap {
  if (typeof window === 'undefined') {
    return EMPTY_REVIEWS;
  }
  try {
    const raw = window.localStorage.getItem(REVIEWED_CAREGIVERS_KEY);
    if (!raw) {
      lastReviewsRaw = null;
      lastReviewsParsed = EMPTY_REVIEWS;
      return EMPTY_REVIEWS;
    }
    if (raw === lastReviewsRaw) {
      return lastReviewsParsed;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      lastReviewsRaw = raw;
      lastReviewsParsed = parsed as ReviewedCaregiverMap;
      return lastReviewsParsed;
    }
  } catch {
    // Ignore storage read/parse errors
  }
  return EMPTY_REVIEWS;
}

function getReviewedCaregiversServerSnapshot(): ReviewedCaregiverMap {
  return EMPTY_REVIEWS;
}

export function useReviewedCaregivers(): ReviewedCaregiverMap {
  return useSyncExternalStore(
    subscribeStorage,
    getReviewedCaregiversSnapshot,
    getReviewedCaregiversServerSnapshot,
  );
}

export function buildReviewedCaregiverKey(
  clientId: string | undefined,
  caregiverId: string,
): string {
  return clientId ? `${clientId}:${caregiverId}` : caregiverId;
}

export function getReviewedCaregiverRecord(
  map: ReviewedCaregiverMap,
  clientId: string | undefined,
  caregiverId: string,
): StoredReviewRecord | null {
  if (!caregiverId) return null;
  if (clientId && map[`${clientId}:${caregiverId}`]) {
    return map[`${clientId}:${caregiverId}`];
  }
  return map[caregiverId] ?? null;
}

export function markCaregiverReviewed(
  clientId: string | undefined,
  caregiverId: string,
  record: StoredReviewRecord,
): void {
  if (typeof window === 'undefined' || !caregiverId) {
    return;
  }
  try {
    const current = getReviewedCaregiversSnapshot();
    const key = buildReviewedCaregiverKey(clientId, caregiverId);
    const next: ReviewedCaregiverMap = {
      ...current,
      [key]: record,
    };
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(REVIEWED_CAREGIVERS_KEY, serialized);
    lastReviewsRaw = serialized;
    lastReviewsParsed = next;
    emitStorageChange();
  } catch {
    // Ignore storage quota issues
  }
}

const emptySubscribe = () => () => {};

function getUtcTodaySnapshot(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUtcTodayServerSnapshot(): string {
  return '';
}

/**
 * Returns today's date in UTC `YYYY-MM-DD` format safely without triggering
 * Next.js 16 `cacheComponents` non-deterministic prerender errors.
 */
export function useUtcTodayInputDate(): string {
  return useSyncExternalStore(
    emptySubscribe,
    getUtcTodaySnapshot,
    getUtcTodayServerSnapshot,
  );
}
