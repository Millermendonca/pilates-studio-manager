import './globals.css';
import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Studio Pilates - Sistema de Gestão Inteligente',
  description: 'Sistema completo de gerenciamento para estúdios de pilates com mapa de calor, grade inteligente, check-in GPS e PIX recorrente.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Studio Pilates',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-pilates-500 selection:text-white min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Studio Pilates Harmonia • Gestão, Grade Inteligente & Geolocalização</p>
        </footer>
      </body>
    </html>
  );
}
