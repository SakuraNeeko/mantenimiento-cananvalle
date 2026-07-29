'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { materials, uoms, woMaterials, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

export async function agregarMaterial(ordenId: string, materialId: string, cantidadSolicitada: string): Promise<AccionResultado> {
  await requirePermission('ordenes.materiales.solicitar');
  if (!materialId) return { ok: false, error: 'Selecciona un material.' };
  if (!cantidadSolicitada || Number(cantidadSolicitada) <= 0) return { ok: false, error: 'Indica una cantidad válida.' };

  const tenant = await getCurrentTenant();
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, ordenId), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite solicitar materiales.' };

  await db.insert(woMaterials).values({ workOrderId: ordenId, materialId, cantidadSolicitada });
  revalidatePath(`/ordenes/${ordenId}/materiales`);
  return { ok: true };
}

export async function eliminarMaterial(ordenId: string, lineaId: string): Promise<AccionResultado> {
  await requirePermission('ordenes.materiales.solicitar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, ordenId), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite cambios en los materiales.' };

  const [linea] = await db.select({ kardexMovementId: woMaterials.kardexMovementId }).from(woMaterials).where(and(eq(woMaterials.id, lineaId), eq(woMaterials.workOrderId, ordenId))).limit(1);
  if (linea?.kardexMovementId) return { ok: false, error: 'Este material ya fue liquidado en el kárdex.' };

  await db.delete(woMaterials).where(and(eq(woMaterials.id, lineaId), eq(woMaterials.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/materiales`);
  return { ok: true };
}

export async function obtenerMaterialesDisponibles() {
  await requirePermission('ordenes.materiales.solicitar');
  const tenant = await getCurrentTenant();
  return db
    .select({ value: materials.id, label: materials.nombre, codigo: materials.codigo, uomSimbolo: uoms.simbolo })
    .from(materials)
    .leftJoin(uoms, eq(uoms.id, materials.uomId))
    .where(and(eq(materials.tenantId, tenant.id), eq(materials.activo, true), isNull(materials.deletedAt)))
    .orderBy(materials.nombre);
}
