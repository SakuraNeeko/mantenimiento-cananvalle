'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assetMeters, assets, meterReadings, meters } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

async function assetDelTenant(assetId: string, tenantId: string): Promise<boolean> {
  const [fila] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, assetId), eq(assets.tenantId, tenantId), isNull(assets.deletedAt))).limit(1);
  return Boolean(fila);
}

export async function asignarMedidor(assetId: string, meterId: string, valorInicial: string, promedioUsoDiario: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.medidores.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await assetDelTenant(assetId, tenant.id))) return { ok: false, error: 'El activo ya no existe.' };

  try {
    await db.insert(assetMeters).values({
      tenantId: tenant.id,
      assetId,
      meterId,
      valorActual: valorInicial || '0',
      promedioUsoDiario: promedioUsoDiario || null,
    });

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'activos.medidores',
      entidadId: assetId,
      accion: 'INSERT',
      permiso: 'activos.medidores.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: { medidorAsignado: { antes: null, despues: meterId } },
    });

    revalidatePath(`/activos/${assetId}/medidores`);
    return { ok: true };
  } catch (error) {
    const esDuplicado = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
    return { ok: false, error: esDuplicado ? 'Ese medidor ya está asignado a este activo.' : 'No se pudo asignar el medidor.' };
  }
}

export async function quitarMedidor(assetId: string, assetMeterId: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.medidores.gestionar');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .update(assetMeters)
    .set({ deletedAt: new Date() })
    .where(and(eq(assetMeters.id, assetMeterId), eq(assetMeters.tenantId, tenant.id), eq(assetMeters.assetId, assetId)))
    .returning({ id: assetMeters.id });
  if (!fila) return { ok: false, error: 'El medidor ya no está asignado.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos.medidores',
    entidadId: assetId,
    accion: 'DELETE',
    permiso: 'activos.medidores.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { medidorQuitado: { antes: assetMeterId, despues: null } },
  });

  revalidatePath(`/activos/${assetId}/medidores`);
  return { ok: true };
}

/**
 * Registra una lectura. Si el medidor no permite retroceso, la lectura debe
 * ser mayor o igual que la actual — regla de negocio explícita del prompt
 * maestro ("validación de retroceso").
 */
export async function registrarLectura(assetId: string, assetMeterId: string, valor: string, observacion?: string): Promise<AccionResultado> {
  const session = await requirePermission('activos.lecturas.registrar');
  const tenant = await getCurrentTenant();

  const nuevoValor = Number(valor);
  if (!Number.isFinite(nuevoValor)) return { ok: false, error: 'La lectura debe ser un número.' };

  const [fila] = await db
    .select({ valorActual: assetMeters.valorActual, permiteRetroceso: meters.permiteRetroceso })
    .from(assetMeters)
    .innerJoin(meters, eq(meters.id, assetMeters.meterId))
    .where(and(eq(assetMeters.id, assetMeterId), eq(assetMeters.tenantId, tenant.id), eq(assetMeters.assetId, assetId), isNull(assetMeters.deletedAt)))
    .limit(1);
  if (!fila) return { ok: false, error: 'El medidor ya no está asignado a este activo.' };

  if (!fila.permiteRetroceso && nuevoValor < Number(fila.valorActual)) {
    return { ok: false, error: `Este medidor no permite retroceso. La última lectura fue ${fila.valorActual}.` };
  }

  await db.insert(meterReadings).values({
    assetMeterId,
    valor: String(nuevoValor),
    origen: 'MANUAL',
    observacion: observacion || null,
    createdBy: session.user.id,
  });

  await db.update(assetMeters).set({ valorActual: String(nuevoValor) }).where(eq(assetMeters.id, assetMeterId));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'activos.lecturas',
    entidadId: assetId,
    accion: 'INSERT',
    permiso: 'activos.lecturas.registrar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { lectura: { antes: fila.valorActual, despues: String(nuevoValor) } },
  });

  revalidatePath(`/activos/${assetId}/medidores`);
  return { ok: true };
}

export async function obtenerLecturas(assetMeterId: string) {
  await requirePermission('activos.ver');
  return db
    .select({ id: meterReadings.id, valor: meterReadings.valor, fecha: meterReadings.fecha, origen: meterReadings.origen, observacion: meterReadings.observacion })
    .from(meterReadings)
    .where(eq(meterReadings.assetMeterId, assetMeterId))
    .orderBy(desc(meterReadings.fecha))
    .limit(50);
}
