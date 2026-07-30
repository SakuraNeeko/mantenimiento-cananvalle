import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { BottomNav } from './_components/bottom-nav';
import { SwRegister } from './_components/sw-register';

export const metadata: Metadata = {
  title: 'GMAO Móvil',
  manifest: '/manifest.webmanifest',
};

/**
 * PWA móvil para técnicos en campo (Fase 11, §"Experiencia móvil"): navegación
 * inferior en vez de sidebar, botones grandes, y una barra de sincronización
 * que refleja lo que quedó pendiente en IndexedDB mientras no había señal.
 * Mismo login que `(app)` — no es un área pública.
 */
export default async function MovilLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenant = await getCurrentTenant();
  const puedeVerSistema = hasPermission(session, 'reportes.dashboard.ver');

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <SwRegister />
      <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
        <div>
          <p className="text-xs font-semibold leading-tight">{tenant.razonSocial}</p>
          <p className="text-2xs text-muted-foreground">{session.user.nombre}</p>
        </div>
        {puedeVerSistema ? (
          <a href="/dashboard" className="text-2xs font-medium text-primary underline-offset-2 hover:underline">
            Ir al escritorio
          </a>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-md flex-1 overflow-y-auto p-3 pb-20">{children}</main>

      <BottomNav />
    </div>
  );
}
