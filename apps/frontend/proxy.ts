import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "cc_token";

type GuardedRole = "CLIENT" | "CAREGIVER" | "ADMIN";

interface DecodedTokenPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}

const ROUTE_ROLE_RULES: Array<{ prefix: string; role: GuardedRole }> = [
  { prefix: "/client", role: "CLIENT" },
  { prefix: "/caregiver", role: "CAREGIVER" },
  { prefix: "/admin", role: "ADMIN" },
];

function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as DecodedTokenPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: DecodedTokenPayload | null): boolean {
  if (!payload || typeof payload.exp !== "number") {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

function getRequiredRole(pathname: string): GuardedRole | null {
  for (const rule of ROUTE_ROLE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.role;
    }
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiredRole = getRequiredRole(pathname);

  if (!requiredRole) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload) || !payload.role) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (payload.role !== requiredRole) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/caregiver/:path*", "/admin/:path*"],
};
