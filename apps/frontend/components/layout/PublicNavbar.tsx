'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { getRoleDashboardPath, useAuth } from '@/lib/auth';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { formatFullName, getInitials } from '@/lib/format';

interface NavLinkItem {
  href: string;
  label: string;
  matchPrefix?: string;
}

const PUBLIC_NAV_LINKS: NavLinkItem[] = [
  {
    href: '/caregivers',
    label: 'Buscar Cuidadores',
    matchPrefix: '/caregivers',
  },
  {
    href: '/job-offers',
    label: 'Ofertas Disponibles',
    matchPrefix: '/job-offers',
  },
  {
    href: '/#como-funciona',
    label: 'Cómo funciona',
  },
];

let clientTrackedPathname = '';
const pathnameListeners = new Set<() => void>();

function subscribeNoop(): () => void {
  return () => {};
}

function getHydratedClientSnapshot(): boolean {
  return true;
}

function getHydratedServerSnapshot(): boolean {
  return false;
}

function subscribeTrackedPathname(listener: () => void): () => void {
  pathnameListeners.add(listener);
  return () => {
    pathnameListeners.delete(listener);
  };
}

function getTrackedPathnameSnapshot(): string {
  return clientTrackedPathname;
}

function getTrackedPathnameServerSnapshot(): string {
  return '';
}

function ClientPathnameObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (clientTrackedPathname !== pathname) {
      clientTrackedPathname = pathname;
      for (const listener of pathnameListeners) {
        listener();
      }
    }
  }, [pathname]);

  return null;
}

export function PublicNavbar() {
  const isHydrated = useSyncExternalStore(
    subscribeNoop,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot,
  );
  const activePathname = useSyncExternalStore(
    subscribeTrackedPathname,
    getTrackedPathnameSnapshot,
    getTrackedPathnameServerSnapshot,
  );
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isMobileMenuOpen =
    mobileMenuPath !== null && mobileMenuPath === activePathname;

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuPath(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setMobileMenuPath(null);
    await logout();
  };

  const dashboardHref = getRoleDashboardPath(user?.role);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      {isHydrated ? <ClientPathnameObserver /> : null}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-[8px]"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-600 text-white shadow-xs">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight text-slate-900">
              CareConnect
            </span>
            <span className="text-[11px] font-medium text-teal-700">
              Cuidado verificado
            </span>
          </div>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-1 md:flex"
        >
          {PUBLIC_NAV_LINKS.map((item) => {
            const isActive =
              Boolean(item.matchPrefix && activePathname) &&
              activePathname.startsWith(item.matchPrefix!);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-[8px] px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {!isLoading && isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pr-3 pl-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                  {formatFullName(user.firstName, user.lastName)}
                </span>
              </div>
              <Link
                href={dashboardHref}
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Mi panel
              </Link>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <LogOut className="h-4 w-4 text-slate-600" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                Registrarse
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileMenuPath(isMobileMenuOpen ? null : activePathname)
          }
          aria-expanded={isMobileMenuOpen}
          aria-controls="public-mobile-menu"
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-slate-200 text-slate-700 transition-colors hover:bg-slate-100 md:hidden cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div
          id="public-mobile-menu"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <nav
            aria-label="Navegación móvil"
            className="flex flex-col gap-1"
          >
            {PUBLIC_NAV_LINKS.map((item) => {
              const isActive =
                Boolean(item.matchPrefix && activePathname) &&
                activePathname.startsWith(item.matchPrefix!);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuPath(null)}
                  className={`rounded-[8px] px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-slate-200 pt-4">
            {!isLoading && isAuthenticated && user ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 px-1">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                    {getInitials(user.firstName, user.lastName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {formatFullName(user.firstName, user.lastName)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {USER_ROLE_LABELS[user.role]}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={dashboardHref}
                    onClick={() => setMobileMenuPath(null)}
                    className={buttonVariants({
                      variant: 'primary',
                      size: 'sm',
                      fullWidth: true,
                    })}
                  >
                    Mi panel
                  </Link>
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    className={buttonVariants({
                      variant: 'secondary',
                      size: 'sm',
                      fullWidth: true,
                    })}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuPath(null)}
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'sm',
                    fullWidth: true,
                  })}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuPath(null)}
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'sm',
                    fullWidth: true,
                  })}
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
