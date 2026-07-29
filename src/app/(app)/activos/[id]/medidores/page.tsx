import { notFound } from 'next/navigation';
import { and, eq, isNull, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { assetMeters, meters, uoms } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { obtenerActivoDetalle } from '../data';
import { MedidoresPanel, type AssetMeterRow } from './medidores-panel';

export default async function MedidoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();

  const detalle = await obtenerActivoDetalle(id);
  if (!detalle) notFound();

  const asignados = await db
    .select({
      id: assetMeters.id,
      meterId: assetMeters.meterId,
      meterNombre: meters.nombre,
      simbolo: uoms.simbolo,
      valorActual: assetMeters.valorActual,
      promedioUsoDiario: assetMeters.promedioUsoDiario,
      permiteRetroceso: meters.permiteRetroceso,
    })
    .from(assetMeters)
    .innerJoin(meters, eq(meters.id, assetMeters.meterId))
    .leftJoin(uoms, eq(uoms.id, meters.uomId))
    .where(and(eq(assetMeters.assetId, id), isNull(assetMeters.deletedAt)))
    .orderBy(meters.nombre);

  const idsAsignados = asignados.map((a) => a.meterId);
  const disponibles = await db
    .select({ value: meters.id, label: meters.nombre })
    .from(meters)
    .where(
      and(
        eq(meters.tenantId, tenant.id),
        eq(meters.activo, true),
        isNull(meters.deletedAt),
        idsAsignados.length > 0 ? notInArray(meters.id, idsAsignados) : undefined,
      ),
    )
    .orderBy(meters.nombre);

  return (
    <MedidoresPanel
      assetId={id}
      asignados={asignados as unknown as AssetMeterRow[]}
      disponibles={disponibles}
      puedeGestionar={hasPermission(session, 'activos.medidores.gestionar')}
      puedeRegistrar={hasPermission(session, 'activos.lecturas.registrar')}
    />
  );
}
