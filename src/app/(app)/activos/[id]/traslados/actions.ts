'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, dbTx } from '@/db';
import { assetTransfers, assets, costCenters, locations } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

const locOrigen = alias(locations, 'loc_origen');
const locDestino = alias(locations, 'loc_destino');
const ccOrigen = alias(costCenters, 'cc_origen');
const ccDestino = alias(costCenters, 'cc_destino');

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function registrarTraslado(
  assetId: string,
  locationDestinoId: string | undefined,
  costCenterDestinoId: string | undefined,
  motivo: string | undefined,
): Promise<AccionResultado> {
  const session = await requirePermission('activos.trasladar');
  const tenant = await getCurrentTenant();

  const [antes] = await db
    .select({ locationId: assets.locationId, costCenterId: assets.costCenterId })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El activo ya no existe.' };

  if (!locationDestinoId && !costCenterDestinoId) {
    return { ok: false, error: 'Indica al menos una ubicación o un centro de costo de destino.' };
  }

  await dbTx.transaction(async (tx) => {
    await tx.insert(assetTransfers).values({
      tenantId: tenant.id,
      assetId,
      locationOrigenId: antes.locationId,
      locationDestinoId: locationDestinoId ?? antes.locationId,
      costCenterOrigenId: antes.costCenterId,
      costCenterDestinoId: costCenterDestinoId ?? antes.costCenterId,
      motivo: motivo || null,
      createdBy: session.user.id,
    });

    await tx
      .update(assets)
      .set({
        locationId: locationDestinoId ?? antes.locationId,
        costCenterId: costCenterDestinoId ?? antes.costCenterId,
      })
      .where(eq(assets.id, assetId));
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos.traslados',
    entidadId: assetId,
    accion: 'INSERT',
    permiso: 'activos.trasladar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: {
      locationId: { antes: antes.locationId, despues: locationDestinoId ?? antes.locationId },
      costCenterId: { antes: antes.costCenterId, despues: costCenterDestinoId ?? antes.costCenterId },
    },
  });

  revalidatePath(`/activos/${assetId}`);
  revalidatePath(`/activos/${assetId}/traslados`);
  return { ok: true };
}

export async function obtenerTraslados(assetId: string) {
  await requirePermission('activos.hoja_vida.ver');
  const tenant = await getCurrentTenant();

  return db
    .select({
      id: assetTransfers.id,
      fecha: assetTransfers.fecha,
      ubicacionOrigen: locOrigen.nombre,
      ubicacionDestino: locDestino.nombre,
      centroCostoOrigen: ccOrigen.nombre,
      centroCostoDestino: ccDestino.nombre,
      motivo: assetTransfers.motivo,
    })
    .from(assetTransfers)
    .leftJoin(locOrigen, eq(locOrigen.id, assetTransfers.locationOrigenId))
    .leftJoin(locDestino, eq(locDestino.id, assetTransfers.locationDestinoId))
    .leftJoin(ccOrigen, eq(ccOrigen.id, assetTransfers.costCenterOrigenId))
    .leftJoin(ccDestino, eq(ccDestino.id, assetTransfers.costCenterDestinoId))
    .where(and(eq(assetTransfers.assetId, assetId), eq(assetTransfers.tenantId, tenant.id)))
    .orderBy(desc(assetTransfers.fecha));
}
