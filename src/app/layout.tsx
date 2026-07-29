import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from '@/components/layout/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'GMAO', template: '%s · GMAO' },
  description: 'Sistema de gestión del mantenimiento asistido por ordenador',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-EC" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Providers>
          {children}
          <Toaster position="bottom-right" closeButton richColors />
        </Providers>
      </body>
    </html>
  );
}
