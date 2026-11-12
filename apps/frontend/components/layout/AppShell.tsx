'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  FileCheck2,
  HeartHandshake,
  History,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { getRoleDashboardPath, useAuth } from '@/lib/auth';
import {
  ROUTE_BREADCRUMB_LABELS,
  USER_ROLE_LABELS,
} from '@/lib/constants';
import { formatFullName, getInitials } from '@/lib/format';
import type { UserRole } from '@/lib/types';

export interface AppShellProps {
  expectedRole: UserRole;
  children: React.ReactNode;
}

interface SidebarNavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  matchExact?: boolean;
}

const ROLE_NAV_ITEMS: Record<UserRole, SidebarNavItem[]> = {
  CLIENT: [
    {
      href: '/client/dashboard',
      label: 'Panel Principal',
      Icon: LayoutDashboard,
      matchExact: true,
    },
    {
      href: '/client/offers',
      label: 'Mis Ofertas',
      Icon: Briefcase,
    },
    {
      href: '/client/offers/create',
      label: 'Publicar Oferta',
      Icon: PlusCircle,
      matchExact: true,
    },
    {
      href: '/client/inquiries',
      label: 'Solicitudes',
      Icon: MessageSquare,
    },
    {
      href: '/client/history',
      label: 'Historial',
      Icon: History,
    },
    {
      href: '/caregivers',
      label: 'Explorar Cuidadores',
      Icon: Search,
    },
    {
      href: '/client/settings/security',
      label: 'Seguridad y 2FA',
      Icon: ShieldCheck,
    },
  ],
  CAREGIVER: [
    {
      href: '/caregiver/dashboard',
      label: 'Panel Principal',
      Icon: LayoutDashboard,
      matchExact: true,
    },
    {
      href: '/caregiver/profile',
      label: 'Mi Perfil',
      Icon: UserCog,
    },
    {
      href: '/caregiver/documents',
      label: 'Documentos',
      Icon: FileCheck2,
    },
    {
      href: '/caregiver/applications',
      label: 'Postulaciones',
      Icon: Send,
    },
    {
      href: '/caregiver/inquiries',
      label: 'Solicitudes',
      Icon: Inbox,
    },
    {
      href: '/caregiver/history',
      label: 'Historial',
      Icon: History,
    },
    {
      href: '/job-offers',
      label: 'Ofertas Abiertas',
      Icon: Search,
    },
    {
      href: '/caregiver/settings/security',
      label: 'Seguridad y 2FA',
      Icon: ShieldCheck,
    },
  ],
  ADMIN: [
    {
      href: '/admin/dashboard',
      label: 'Panel Principal',
      Icon: LayoutDashboard,
      matchExact: true,
    },
    {
      href: '/admin/documents',
      label: 'Verificación Documental',
      Icon: FileCheck2,
    },
    {
      href: '/admin/users',
      label: 'Usuarios y Roles',
      Icon: Users,
    },
    {
      href: '/admin/reports',
      label: 'Reportes',
      Icon: BarChart3,
    },
    {
      href: '/admin/settings/security',
      label: 'Seguridad y 2FA',
      Icon: ShieldCheck,
    },
  ],
};

const ROLE_PRIMARY_CTA: Record<
  UserRole,
  { href: string; label: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }
> = {
  CLIENT: {
    href: '/client/offers/create',
    label: 'Publicar Oferta',
    Icon: PlusCircle,
  },
  CAREGIVER: {
    href: '/job-offers',
    label: 'Ver Ofertas',
    Icon: Search,
  },
  ADMIN: {
    href: '/admin/documents',
    label: 'Revisar Documentos',
    Icon: FileCheck2,
  },
};

const SECURITY_ROUTE_BY_ROLE: Record<UserRole, string> = {
  CLIENT: '/client/settings/security',
  CAREGIVER: '/caregiver/settings/security',
  ADMIN: '/admin/settings/security',
};

const ROUTABLE_PORTAL_PATHS = new Set<string>([
  '/client/dashboard',
  '/client/offers',
  '/client/offers/create',
  '/client/inquiries',
  '/client/history',
  '/client/reviews/new',
  '/client/settings/security',
  '/caregiver/dashboard',
  '/caregiver/profile',
  '/caregiver/documents',
  '/caregiver/applications',
  '/caregiver/inquiries',
  '/caregiver/history',
  '/caregiver/settings/security',
  '/admin/dashboard',
  '/admin/documents',
  '/admin/users',
  '/admin/reports',
  '/admin/settings/security',
]);

function isUuidLike(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f-]{4,}$/i.test(segment) || /^\d+$/.test(segment);
}

interface BreadcrumbItem {
  label: string;
  href: string | null;
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];
  let accumulated = '';

  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;

    let label = ROUTE_BREADCRUMB_LABELS[segment];
    if (!label) {
      if (isUuidLike(segment)) {
        label = 'Detalle';
      } else {
        label =
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }
    }

    const isRoleRoot = index === 0;
    const candidateHref = isRoleRoot
      ? `${accumulated}/dashboard`
      : accumulated;
    const href = ROUTABLE_PORTAL_PATHS.has(candidateHref)
      ? candidateHref
      : null;

    crumbs.push({ label, href });
  });

  return crumbs;
}

export function AppShell({
  expectedRole,
  children,
}: Readonly<AppShellProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerPath, setMobileDrawerPath] = useState<string | null>(null);
  const [userMenuPath, setUserMenuPath] = useState<string | null>(null);
  const [notificationsPath, setNotificationsPath] = useState<string | null>(
    null,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);

  const isMobileDrawerOpen = mobileDrawerPath === pathname;
  const isUserMenuOpen = userMenuPath === pathname;
  const isNotificationsOpen = notificationsPath === pathname;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user.role !== expectedRole) {
      router.replace('/forbidden');
    }
  }, [isLoading, isAuthenticated, user, expectedRole, pathname, router]);

  useEffect(() => {
    if (!isUserMenuOpen && !isNotificationsOpen && !isMobileDrawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuPath(null);
        setNotificationsPath(null);
        setMobileDrawerPath(null);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isUserMenuOpen &&
        userMenuContainerRef.current &&
        !userMenuContainerRef.current.contains(target)
      ) {
        setUserMenuPath(null);
      }
      if (
        isNotificationsOpen &&
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(target)
      ) {
        setNotificationsPath(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isUserMenuOpen, isNotificationsOpen, isMobileDrawerOpen]);

  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  const navItems = ROLE_NAV_ITEMS[expectedRole];
  const primaryCta = ROLE_PRIMARY_CTA[expectedRole];
  const PrimaryCtaIcon = primaryCta.Icon;
  const securityHref = SECURITY_ROUTE_BY_ROLE[expectedRole];
  const dashboardHref = getRoleDashboardPath(expectedRole);

  const notificationAlerts = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      href: string;
      tone: 'amber' | 'teal';
    }> = [];

    if (user && !user.isTwoFactorEnabled) {
      items.push({
        id: '2fa-setup',
        title: 'Protege tu cuenta con 2FA',
        description:
          'Activa la verificación en dos pasos para mayor seguridad de tu cuenta.',
        href: securityHref,
        tone: 'amber',
      });
    }

    if (expectedRole === 'CAREGIVER') {
      items.push({
        id: 'caregiver-docs',
        title: 'Mantén tus documentos al día',
        description:
          'Revisa el estado de aprobación de tu cédula y antecedentes.',
        href: '/caregiver/documents',
        tone: 'teal',
      });
    } else if (expectedRole === 'CLIENT') {
      items.push({
        id: 'client-inquiries',
        title: 'Bandeja de solicitudes',
        description:
          'Consulta el estado de tus solicitudes de contacto con cuidadores.',
        href: '/client/inquiries',
        tone: 'teal',
      });
    } else if (expectedRole === 'ADMIN') {
      items.push({
        id: 'admin-docs',
        title: 'Cola de verificación documental',
        description:
          'Revisa los documentos pendientes cargados por cuidadores.',
        href: '/admin/documents',
        tone: 'teal',
      });
    }

    return items;
  }, [user, expectedRole, securityHref]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setUserMenuPath(null);
    await logout();
  };

  if (isLoading || !isAuthenticated || !user || user.role !== expectedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4">
        <div className="flex items-center gap-3 rounded-[12px] border border-slate-200 bg-white px-5 py-4 shadow-xs">
          <Loader2
            className="h-5 w-5 animate-spin text-teal-600"
            aria-hidden
          />
          <span className="text-sm font-medium text-slate-700">
            Validando sesión...
          </span>
        </div>
      </div>
    );
  }

  const isNavItemActive = (item: SidebarNavItem): boolean => {
    if (item.matchExact) {
      return pathname === item.href;
    }
    if (item.href === '/client/offers' && pathname === '/client/offers/create') {
      return false;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const renderSidebarLinks = (collapsed: boolean, onNavigate?: () => void) => (
    <nav aria-label="Menú de portal" className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.Icon;
        const active = isNavItemActive(item);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center px-2' : ''
            } ${
              active
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 ${
                active
                  ? 'text-teal-700'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
              aria-hidden
            />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Desktop collapsible sidebar (240px / 64px) */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-slate-200 px-3 ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!sidebarCollapsed ? (
            <Link
              href={dashboardHref}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-teal-600 text-white">
                <HeartHandshake className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">
                  CareConnect
                </span>
                <span className="block truncate text-[11px] font-medium text-teal-700">
                  {USER_ROLE_LABELS[expectedRole]}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href={dashboardHref}
              title="CareConnect"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-teal-600 text-white"
            >
              <HeartHandshake className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>

        {renderSidebarLinks(sidebarCollapsed)}

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={
              sidebarCollapsed
                ? 'Expandir barra lateral'
                : 'Colapsar barra lateral'
            }
            className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden />
                <span>Colapsar menú</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile slide-over drawer */}
      {isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            onClick={() => setMobileDrawerPath(null)}
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]"
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <Link
                href={dashboardHref}
                onClick={() => setMobileDrawerPath(null)}
                className="flex items-center gap-2.5"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-teal-600 text-white">
                  <HeartHandshake className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <span className="block text-sm font-bold text-slate-900">
                    CareConnect
                  </span>
                  <span className="block text-[11px] font-medium text-teal-700">
                    {USER_ROLE_LABELS[expectedRole]}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerPath(null)}
                aria-label="Cerrar menú"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {renderSidebarLinks(false, () => setMobileDrawerPath(null))}
          </aside>
        </div>
      ) : null}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerPath(pathname)}
              aria-label="Abrir navegación"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <nav
              aria-label="Ruta actual"
              className="flex min-w-0 items-center gap-1.5 text-sm"
            >
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    {index > 0 ? (
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden
                      />
                    ) : null}
                    {isLast ? (
                      <span className="truncate font-semibold text-slate-900">
                        {crumb.label}
                      </span>
                    ) : crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="hidden truncate text-slate-500 transition-colors hover:text-teal-700 sm:inline"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="hidden truncate text-slate-500 sm:inline">
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href={primaryCta.href}
              className={buttonVariants({
                variant: 'primary',
                size: 'sm',
                className: 'hidden sm:inline-flex',
              })}
            >
              <PrimaryCtaIcon className="h-4 w-4" aria-hidden />
              {primaryCta.label}
            </Link>

            {/* Notifications */}
            <div ref={notificationsContainerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuPath(null);
                  setNotificationsPath(isNotificationsOpen ? null : pathname);
                }}
                aria-expanded={isNotificationsOpen}
                aria-label="Notificaciones y recordatorios"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
              >
                <Bell className="h-4 w-4" aria-hidden />
                {!user.isTwoFactorEnabled ? (
                  <span
                    aria-hidden
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500"
                  />
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[12px] border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Recordatorios
                    </span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {notificationAlerts.length}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {notificationAlerts.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setNotificationsPath(null)}
                        className="flex items-start gap-2.5 rounded-[8px] p-2.5 transition-colors hover:bg-slate-50"
                      >
                        <span
                          className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            item.tone === 'amber'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-teal-50 text-teal-600'
                          }`}
                        >
                          {item.tone === 'amber' ? (
                            <ShieldAlert className="h-4 w-4" aria-hidden />
                          ) : (
                            <Bell className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-4 text-slate-600">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* User dropdown */}
            <div ref={userMenuContainerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsPath(null);
                  setUserMenuPath(isUserMenuOpen ? null : pathname);
                }}
                aria-expanded={isUserMenuOpen}
                aria-label="Menú de usuario"
                className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white py-1 pr-2.5 pl-1.5 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                  {getInitials(user.firstName, user.lastName)}
                </span>
                <span className="hidden max-w-[130px] truncate text-left text-xs font-medium text-slate-800 md:block">
                  {formatFullName(user.firstName, user.lastName)}
                </span>
              </button>

              {isUserMenuOpen ? (
                <div className="absolute right-0 mt-2 w-64 rounded-[12px] border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {formatFullName(user.firstName, user.lastName)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                      {USER_ROLE_LABELS[user.role]}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      href={dashboardHref}
                      onClick={() => setUserMenuPath(null)}
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <LayoutDashboard className="h-4 w-4 text-slate-500" aria-hidden />
                      Ir al panel principal
                    </Link>
                    <Link
                      href={securityHref}
                      onClick={() => setUserMenuPath(null)}
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
                      Seguridad y 2FA
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
