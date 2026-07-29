import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutGrid } from 'lucide-react';

/**
 * Portal ligero del solicitante (§6 del prompt maestro): cualquier empleado
 * puede reportar una falla y seguirla, sin ver el resto del sistema. Mismo
 * login que `(app)`, layout completamente distinto — sin sidebar de módulos.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenant = await getCurrentTenant();
  const puedeVerSistema = hasPermission(session, 'reportes.dashboard.ver');

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
            <span className="font-codigo text-xs font-bold">GM</span>
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight">{tenant.razonSocial}</p>
            <p className="text-2xs text-muted-foreground">Portal de solicitudes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{session.user.nombre}</span>
          {puedeVerSistema ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <LayoutGrid aria-hidden />
                Ir al sistema
              </Link>
            </Button>
          ) : null}
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              <LogOut aria-hidden />
              Salir
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </div>
  );
}
