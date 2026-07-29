import type { Metadata } from 'next';
import Link from 'next/link';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { Activity, ShieldCheck, Users2, Wrench } from 'lucide-react';
import { db } from '@/db';
import { auditLog, users, workOrders } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { getCurrentTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fmtRelative } from '@/lib/datetime';
import { calcularDisponibilidad, calcularMTBF, calcularMTTR } from '@/lib/kpis/calculos';

export const metadata: Metadata = { title: 'Dashboard' };

const ESTADOS_ABIERTOS_OT = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA', 'LIQUIDADA'] as const;

export default async function DashboardPage() {
  const session = await requirePermission('reportes.dashboard.ver');
  const tenant = await getCurrentTenant();

  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const inicioMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const [usuariosActivos, eventos, criticos, ordenesAbiertas, mtbf, mttr] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.activo, true))),
    db
      .select({
        id: auditLog.id,
        entidad: auditLog.entidad,
        accion: auditLog.accion,
        nivel: auditLog.nivel,
        permiso: auditLog.permiso,
        userEmail: auditLog.userEmail,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenant.id))
      .orderBy(sql`${auditLog.createdAt} desc`)
      .limit(8),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(and(eq(auditLog.tenantId, tenant.id), eq(auditLog.nivel, 'CRITICO'), gte(auditLog.createdAt, desde))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(workOrders)
      .where(and(eq(workOrders.tenantId, tenant.id), inArray(workOrders.estado, [...ESTADOS_ABIERTOS_OT]))),
    calcularMTBF(tenant.id, { desde: inicioMes, hasta: new Date() }),
    calcularMTTR(tenant.id, { desde: inicioMes, hasta: new Date() }),
  ]);

  const disponibilidad = calcularDisponibilidad(mtbf.mtbfHoras, mttr.mttrHoras);

  const tarjetas = [
    { titulo: 'Usuarios activos', valor: usuariosActivos[0]?.n ?? 0, icono: Users2 },
    { titulo: 'Eventos críticos (7 d)', valor: criticos[0]?.n ?? 0, icono: ShieldCheck },
    { titulo: 'Órdenes abiertas', valor: ordenesAbiertas[0]?.n ?? 0, icono: Wrench },
    { titulo: 'Disponibilidad (mes)', valor: disponibilidad !== null ? `${disponibilidad.toFixed(1)}%` : '—', icono: Activity, nota: disponibilidad === null ? 'Sin paros registrados este mes' : undefined },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={`Hola, ${session.user.nombre.split(' ')[0]}`}
        descripcion={`${tenant.razonSocial} · ${session.user.roles.join(', ')}`}
        acciones={
          hasPermission(session, 'reportes.operativos.ver') ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/reportes">
                <Activity aria-hidden />
                Ver reportes completos
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map((t) => {
          const Icono = t.icono;
          return (
            <Card key={t.titulo}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{t.titulo}</CardTitle>
                <Icono className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular">{t.valor}</p>
                {t.nota ? <p className="text-2xs text-muted-foreground">{t.nota}</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {eventos.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Todavía no hay actividad registrada.</p>
          ) : (
            eventos.map((e) => (
              <div key={e.id} className="flex items-center gap-2 border-b py-1.5 text-xs last:border-0">
                <Badge variant={e.nivel === 'CRITICO' ? 'destructive' : 'neutral'}>{e.accion}</Badge>
                <span className="font-medium">{e.entidad}</span>
                {e.permiso ? <span className="font-codigo text-muted-foreground">{e.permiso}</span> : null}
                <span className="ml-auto shrink-0 text-muted-foreground">{e.userEmail ?? 'sistema'}</span>
                <span className="shrink-0 text-muted-foreground">{fmtRelative(e.createdAt, tenant.timezone)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
