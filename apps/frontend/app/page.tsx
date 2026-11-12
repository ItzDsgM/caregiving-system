export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white shadow-sm">
              C
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              CareConnect
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              v1.0 Monorepo
            </span>
          </div>

          <nav className="flex items-center gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              API Base:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                /api/v1
              </code>
            </span>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/70 px-4 py-1.5 text-xs font-semibold text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                Frontend listo para fase de diseño
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
                Cuidado confiable para quienes{" "}
                <span className="text-teal-600 dark:text-teal-400">más importan</span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Plataforma integral para conectar familias con cuidadores certificados y verificados.
                Diseñada con verificación documental, seguridad 2FA y matching basado en especialidades.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 cursor-pointer"
                >
                  Buscar Cuidadores
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Ofrecer Servicios de Cuidado
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Modalidades de Cuidado */}
        <section className="border-t border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Modalidades de Cuidado Especializado
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Servicios respaldados por las entidades y reglas de negocio del sistema CareConnect.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 text-3xl">👵</div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Adulto Mayor</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Acompañamiento, administración de medicamentos y asistencia diaria geriátrica.
                </p>
                <span className="mt-3 inline-block font-mono text-[11px] text-teal-600 dark:text-teal-400">
                  ELDERLY_CARE
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 text-3xl">👶</div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Cuidado Infantil</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Atención pedagógica, acompañamiento escolar y cuidado integral de niños y niñas.
                </p>
                <span className="mt-3 inline-block font-mono text-[11px] text-teal-600 dark:text-teal-400">
                  CHILD_CARE
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 text-3xl">🧩</div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Discapacidad Cognitiva</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Estimulación neurológica, rutinas adaptadas y acompañamiento terapéutico especializado.
                </p>
                <span className="mt-3 inline-block font-mono text-[11px] text-teal-600 dark:text-teal-400">
                  COGNITIVE_DISABILITY
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 text-3xl">♿</div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Discapacidad Física</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Movilidad asistida, terapia física diaria y soporte postural especializado.
                </p>
                <span className="mt-3 inline-block font-mono text-[11px] text-teal-600 dark:text-teal-400">
                  PHYSICAL_DISABILITY
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Pilares de Arquitectura */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-8 sm:p-12 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Arquitectura Monorepo Bun
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Estructura desacoplada y lista para escalamiento horizontal con Docker Compose:
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    apps/backend
                  </span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    NestJS 12, TypeORM, PostgreSQL, 2FA TOTP, RBAC & 100% test pass.
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    apps/frontend
                  </span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Next.js 16 (App Router), Tailwind CSS v4, TypeScript & SSR.
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-4 shadow-sm dark:bg-slate-800/80">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    docker-compose.yml
                  </span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Orquestación completa: PostgreSQL 16 + Backend API + Frontend Web.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p>CareConnect Monorepo &copy; 2026. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
