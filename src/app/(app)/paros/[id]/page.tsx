import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, downtimes, failureCauses, failureEffects, locations, technicalActions, users, workOrders } from '@/db/schema';
import { assertSiteAccess, hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { obtenerOpcionesParo } from '../actions';
import { ParoDetalleClient } from './paro-detalle-client';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  const [paro] = await db.select({ consecutivo: downtimes.consecutivo }).from(downtimes).where(and(eq(downtimes.id, id), eq(downtimes.tenantId, tenant.id))).limit(1);
  return { title: paro?.consecutivo ?? 'Paro' };
}

export default async function ParoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('paros.ver');
  const tenant = await getCurrentTenant();

  const [paro] = await db
    .select({
      id: downtimes.id,
      consecutivo: downtimes.consecutivo,
      assetId: downtimes.assetId,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      tipo: downtimes.tipo,
      estado: downtimes.estado,
      fechaInicio: downtimes.fechaInicio,
      fechaFin: downtimes.fechaFin,
      duracionMinutos: downtimes.duracionMinutos,
      causaFallaId: downtimes.causaFallaId,
      causaFallaNombre: failureCauses.nombre,
      efectoFallaId: downtimes.efectoFallaId,
      efectoFallaNombre: failureEffects.nombre,
      technicalActionId: downtimes.technicalActionId,
      technicalActionNombre: technicalActions.nombre,
      impactoUnidadesNoProducidas: downtimes.impactoUnidadesNoProducidas,
      impactoCostoEstimado: downtimes.impactoCostoEstimado,
      workOrderId: downtimes.workOrderId,
      workOrderConsecutivo: workOrders.consecutivo,
      responsableReporteUserId: downtimes.responsableReporteUserId,
      responsableNombre: users.nombre,
      observaciones: downtimes.observaciones,
      assetSiteId: locations.siteId,
    })
    .from(downtimes)
    .innerJoin(assets, eq(assets.id, downtimes.assetId))
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .leftJoin(failureCauses, eq(failureCauses.id, downtimes.causaFallaId))
    .leftJoin(failureEffects, eq(failureEffects.id, downtimes.efectoFallaId))
    .leftJoin(technicalActions, eq(technicalActions.id, downtimes.technicalActionId))
    .leftJoin(workOrders, eq(workOrders.id, downtimes.workOrderId))
    .leftJoin(users, eq(users.id, downtimes.responsableReporteUserId))
    .where(and(eq(downtimes.id, id), eq(downtimes.tenantId, tenant.id)))
    .limit(1);
  if (!paro) notFound();
  // Oculto en el menú no basta (§8): bloquea también la URL directa a un paro de una sede que no te corresponde,
  // salvo que seas quien lo reportó (alcance PROPIO siempre ve lo suyo, igual que en el listado).
  if (paro.responsableReporteUserId !== session.user.id) {
    assertSiteAccess(session, paro.assetSiteId ?? null);
  }

  const opciones = await obtenerOpcionesParo().catch(() => ({ assets: [], failureCauses: [], failureEffects: [], technicalActions: [] }));

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <PageHeader titulo={paro.consecutivo} descripcion={`${paro.assetCodigo} — ${paro.assetNombre}`} />
      <ParoDetalleClient
        paro={paro}
        opciones={opciones}
        permisos={{
          editar: hasPermission(session, 'paros.editar'),
          cerrar: hasPermission(session, 'paros.cerrar'),
          convertir: hasPermission(session, 'paros.convertir_ot'),
        }}
      />
    </div>
  );
}
