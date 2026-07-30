import { redirect } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { notifications, sites, tenantModules } from '@/db/schema';
import { getCurrentTenant } from '@/lib/tenant';
import { leerSedeActivaCookie } from '@/lib/tenant/sede-activa';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { SidebarMobileProvider } from '@/components/layout/sidebar-mobile-context';
import { visibleNav } from '@/components/layout/nav-config';
import { sql } from 'drizzle-orm';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenant = await getCurrentTenant();

  const [sedes, modulos, sinLeer, sedeCookie] = await Promise.all([
    db
      .select({ id: sites.id, nombre: sites.nombre })
      .from(sites)
      .where(and(eq(sites.tenantId, tenant.id), eq(sites.activo, true), isNull(sites.deletedAt))),
    db
      .select({ modulo: tenantModules.modulo })
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenant.id), eq(tenantModules.habilitado, true))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), isNull(notifications.leidaAt))),
    leerSedeActivaCookie(),
  ]);

  // El usuario solo ve las sedes a las que tiene acceso (salvo alcance TENANT).
  const sedesVisibles =
    session.user.scope === 'TENANT' ? sedes : sedes.filter((s) => session.user.siteIds.includes(s.id));

  // Cookie (la sede que el usuario eligió a mano) > sede por defecto de su rol > la primera visible.
  const sedeActual =
    (sedeCookie && sedesVisibles.some((s) => s.id === sedeCookie) ? sedeCookie : null) ??
    session.user.siteDefaultId ??
    sedesVisibles[0]?.id ??
    null;

  const grupos = visibleNav(
    session.user.permissions,
    modulos.map((m) => m.modulo),
  );

  return (
    <SidebarMobileProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar grupos={grupos} empresa={tenant.razonSocial} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            nombre={session.user.nombre}
            email={session.user.email ?? ''}
            roles={session.user.roles}
            sedes={sedesVisibles}
            sedeActual={sedeActual}
            mostrarTodasLasSedes={session.user.scope === 'TENANT'}
            notificacionesSinLeer={sinLeer[0]?.n ?? 0}
          />
          <main className="min-h-0 flex-1 overflow-auto p-2.5 sm:p-4">{children}</main>
        </div>
      </div>
    </SidebarMobileProvider>
  );
}
