'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetCharacteristics, assets, characteristics } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

/**
 * Guarda todas las características a la vez (no una acción por campo): un
 * solo viaje a la base y una sola entrada de auditoría con el diff completo.
 */
export async function guardarCaracteristicas(assetId: string, valores: Record<string, string>): Promise<AccionResultado> {
  const session = await requirePermission('activos.editar');
  const tenant = await getCurrentTenant();

  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);
  if (!asset) return { ok: false, error: 'El activo ya no existe.' };

  const ids = Object.keys(valores);
  if (ids.length === 0) return { ok: true };

  const defs = await db
    .select({ id: characteristics.id, codigo: characteristics.codigo })
    .from(characteristics)
    .where(and(eq(characteristics.tenantId, tenant.id), inArray(characteristics.id, ids)));
  const defsPorId = new Map(defs.map((d) => [d.id, d.codigo]));

  const actuales = await db
    .select({ characteristicId: assetCharacteristics.characteristicId, valor: assetCharacteristics.valor })
    .from(assetCharacteristics)
    .where(eq(assetCharacteristics.assetId, assetId));
  const actualesPorId = new Map(actuales.map((a) => [a.characteristicId, a.valor]));

  const diff: Record<string, { antes: unknown; despues: unknown }> = {};

  for (const [characteristicId, valorNuevo] of Object.entries(valores)) {
    const codigo = defsPorId.get(characteristicId);
    if (!codigo) continue; // no pertenece a este tenant / no existe

    const valorAnterior = actualesPorId.get(characteristicId) ?? null;
    const nuevo = valorNuevo.trim() === '' ? null : valorNuevo.trim();
    if (nuevo === valorAnterior) continue;

    diff[codigo] = { antes: valorAnterior, despues: nuevo };

    if (nuevo === null) {
      await db.delete(assetCharacteristics).where(and(eq(assetCharacteristics.assetId, assetId), eq(assetCharacteristics.characteristicId, characteristicId)));
    } else {
      await db
        .insert(assetCharacteristics)
        .values({ assetId, characteristicId, valor: nuevo, updatedBy: session.user.id })
        .onConflictDoUpdate({
          target: [assetCharacteristics.assetId, assetCharacteristics.characteristicId],
          set: { valor: nuevo, updatedAt: new Date(), updatedBy: session.user.id },
        });
    }
  }

  if (Object.keys(diff).length > 0) {
    await writeAudit({
      tenantId: tenant.id,
      entidad: 'activos.caracteristicas',
      entidadId: assetId,
      accion: 'UPDATE',
      permiso: 'activos.editar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff,
    });
  }

  revalidatePath(`/activos/${assetId}/caracteristicas`);
  return { ok: true };
}
