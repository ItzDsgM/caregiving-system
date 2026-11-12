import React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-600 text-white">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-base font-bold tracking-tight text-slate-900">
                CareConnect
              </span>
            </Link>
            <p className="text-sm leading-6 text-slate-600">
              Conectamos familias con cuidadores verificados para adultos
              mayores, cuidado infantil y asistencia especializada en Colombia.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Verificación documental obligatoria
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Explorar
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link
                  href="/caregivers"
                  className="transition-colors hover:text-teal-700"
                >
                  Directorio de Cuidadores
                </Link>
              </li>
              <li>
                <Link
                  href="/job-offers"
                  className="transition-colors hover:text-teal-700"
                >
                  Bolsa de Ofertas
                </Link>
              </li>
              <li>
                <Link
                  href="/#como-funciona"
                  className="transition-colors hover:text-teal-700"
                >
                  Cómo funciona
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Cuentas
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <Link
                  href="/register/client"
                  className="transition-colors hover:text-teal-700"
                >
                  Registrarme como Familia
                </Link>
              </li>
              <li>
                <Link
                  href="/register/caregiver"
                  className="transition-colors hover:text-teal-700"
                >
                  Postularme como Cuidador
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="transition-colors hover:text-teal-700"
                >
                  Iniciar Sesión
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Confianza y Seguridad
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm leading-6 text-slate-600">
              <li>Privacidad de teléfono y correo protegida hasta aceptación.</li>
              <li>Autenticación de dos factores (2FA TOTP) disponible.</li>
              <li>Reseñas verificadas por servicio finalizado.</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 CareConnect. Plataforma de Cuidado y Asistencia.</p>
          <p>Calma clínica, trazabilidad y respeto en cada cuidado.</p>
        </div>
      </div>
    </footer>
  );
}
