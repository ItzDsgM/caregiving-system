"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  authApi,
  registerUnauthorizedHandler,
  usersApi,
} from "./api";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  PENDING_2FA_STORAGE_KEY,
  ROLE_HOME_ROUTES,
} from "./constants";
import { decodeJwtPayload, isJwtExpired } from "./format";
import type {
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  TwoFactorAuthenticatePayload,
  User,
  UserRole,
} from "./types";

export interface PendingTwoFactorSession {
  email: string;
  challengeToken: string;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingTwoFactor: PendingTwoFactorSession | null;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  completeTwoFactorLogin: (
    payload: TwoFactorAuthenticatePayload,
  ) => Promise<LoginSuccessResponse>;
  clearPendingTwoFactor: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  getDashboardRoute: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getRoleDashboardPath(role?: UserRole | null): string {
  if (!role) return "/";
  return ROLE_HOME_ROUTES[role] ?? "/";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return null;
  }
}

function writeAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  const payload = decodeJwtPayload(token);
  const nowSec = Math.floor(Date.now() / 1000);
  const maxAge =
    payload?.exp && payload.exp > nowSec
      ? Math.max(60, payload.exp - nowSec)
      : 60 * 60 * 24;
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
}

function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromCookie = readCookie(AUTH_COOKIE_NAME);
  if (fromCookie) return fromCookie;
  try {
    return (
      window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ||
      window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY) ||
      window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeStoredSession(token: string, user: User): void {
  writeAuthCookie(token);
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(user);
  try {
    window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota issues
  }
}

export function clearStoredAuthSession(): void {
  clearAuthCookie();
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    window.sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore storage issues
  }
}

function readPending2FA(): PendingTwoFactorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_2FA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingTwoFactorSession>;
    if (parsed?.email && parsed?.challengeToken) {
      return { email: parsed.email, challengeToken: parsed.challengeToken };
    }
    return null;
  } catch {
    return null;
  }
}

function writePending2FA(session: PendingTwoFactorSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!session) {
      window.sessionStorage.removeItem(PENDING_2FA_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(PENDING_2FA_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage issues
  }
}

export function isTwoFactorChallengeResponse(
  res: LoginResponse,
): res is Extract<LoginResponse, { isTwoFactorRequired: true }> {
  return "isTwoFactorRequired" in res && res.isTwoFactorRequired === true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pendingTwoFactor, setPendingTwoFactor] =
    useState<PendingTwoFactorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  const setUser = useCallback((nextUser: User | null) => {
    setUserState(nextUser);
    if (typeof window === "undefined") return;
    try {
      if (nextUser) {
        const serialized = JSON.stringify(nextUser);
        window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
        window.localStorage.setItem(AUTH_USER_STORAGE_KEY, serialized);
      } else {
        window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage issues
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = readStoredToken();
    if (!currentToken) {
      setUserState(null);
      setToken(null);
      return null;
    }

    const decoded = decodeJwtPayload(currentToken);
    if (isJwtExpired(decoded)) {
      clearStoredAuthSession();
      setUserState(null);
      setToken(null);
      return null;
    }

    try {
      const freshUser = await usersApi.getMe();
      writeStoredSession(currentToken, freshUser);
      setToken(currentToken);
      setUserState(freshUser);
      return freshUser;
    } catch {
      clearStoredAuthSession();
      setUserState(null);
      setToken(null);
      return null;
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      if (isLoggingOutRef.current) return;
      clearStoredAuthSession();
      setToken(null);
      setUserState(null);
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const isProtected =
          currentPath.startsWith("/client") ||
          currentPath.startsWith("/caregiver") ||
          currentPath.startsWith("/admin");
        if (isProtected) {
          const target = `/login?redirect=${encodeURIComponent(
            `${window.location.pathname}${window.location.search}`,
          )}`;
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Hard reload clears cached Next 16 Activity state on 401 expiry
          window.location.assign(target);
        }
      }
    });

    return () => registerUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      const storedPending = readPending2FA();
      if (active && storedPending) {
        setPendingTwoFactor(storedPending);
      }

      const storedToken = readStoredToken();
      if (!storedToken) {
        if (active) setIsLoading(false);
        return;
      }

      const payload = decodeJwtPayload(storedToken);
      if (isJwtExpired(payload)) {
        clearStoredAuthSession();
        if (active) {
          setToken(null);
          setUserState(null);
          setIsLoading(false);
        }
        return;
      }

      // Sync cookie in case token came from storage
      writeAuthCookie(storedToken);
      const cachedUser = readStoredUser();
      if (active) {
        setToken(storedToken);
        if (cachedUser) {
          setUserState(cachedUser);
        }
      }

      try {
        const freshUser = await usersApi.getMe();
        if (active) {
          writeStoredSession(storedToken, freshUser);
          setUserState(freshUser);
        }
      } catch {
        clearStoredAuthSession();
        if (active) {
          setToken(null);
          setUserState(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  const persistLoginSuccess = useCallback((res: LoginSuccessResponse) => {
    writeStoredSession(res.access_token, res.user);
    writePending2FA(null);
    setPendingTwoFactor(null);
    setToken(res.access_token);
    setUserState(res.user);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResponse> => {
      const response = await authApi.login(payload);
      if (isTwoFactorChallengeResponse(response)) {
        const pending: PendingTwoFactorSession = {
          email: response.email,
          challengeToken: response.challengeToken,
        };
        writePending2FA(pending);
        setPendingTwoFactor(pending);
        return response;
      }

      persistLoginSuccess(response);
      return response;
    },
    [persistLoginSuccess],
  );

  const completeTwoFactorLogin = useCallback(
    async (payload: TwoFactorAuthenticatePayload): Promise<LoginSuccessResponse> => {
      const response = await authApi.authenticateTwoFactor(payload);
      persistLoginSuccess(response);
      return response;
    },
    [persistLoginSuccess],
  );

  const clearPendingTwoFactor = useCallback(() => {
    writePending2FA(null);
    setPendingTwoFactor(null);
  }, []);

  const logout = useCallback(async () => {
    isLoggingOutRef.current = true;
    try {
      if (readStoredToken()) {
        await authApi.logout();
      }
    } catch {
      // Best effort: proceed with local cleanup even if backend session already expired
    } finally {
      clearStoredAuthSession();
      setToken(null);
      setUserState(null);
      setPendingTwoFactor(null);
      if (typeof window !== "undefined") {
        // Full reload clears Next 16 <Activity> cached private routes cleanly
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Hard reload clears cached Next 16 Activity state on logout
        window.location.assign("/login");
      }
      isLoggingOutRef.current = false;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      pendingTwoFactor,
      login,
      completeTwoFactorLogin,
      clearPendingTwoFactor,
      logout,
      refreshUser,
      setUser,
      getDashboardRoute: (role?: UserRole) => getRoleDashboardPath(role ?? user?.role),
    }),
    [
      user,
      token,
      isLoading,
      pendingTwoFactor,
      login,
      completeTwoFactorLogin,
      clearPendingTwoFactor,
      logout,
      refreshUser,
      setUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe utilizarse dentro de un <AuthProvider>");
  }
  return ctx;
}
