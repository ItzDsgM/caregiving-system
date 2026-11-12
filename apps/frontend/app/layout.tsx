import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider, ToastRegion } from '@/components/ui/ToastRegion';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'CareConnect | Plataforma de Cuidado y Asistencia',
    template: '%s | CareConnect',
  },
  description:
    'Conectamos familias con cuidadores certificados y verificados para el cuidado de adultos mayores, niños y personas con discapacidad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f8fafc] font-sans text-slate-900">
        <AuthProvider>
          <ToastProvider>
            {children}
            <ToastRegion />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
