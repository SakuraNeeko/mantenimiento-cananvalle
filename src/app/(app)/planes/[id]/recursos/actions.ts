'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { maintenancePlans, materials, planResources, trades } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

async function planExiste(planId: string, tenantId: string) {
  const [plan] = await db.select({ id: maintenancePlans.id }).from(maintenancePlans).where(and(eq(maintenancePlans.id, planId), eq(maintenancePlans.tenantId, tenantId), isNull(maintenancePlans.deletedAt))).limit(1);
  return Boolean(plan);
}

export async function agregarRecursoManoObra(planId: string, input: { tradeId: string; horasEstimadas: string; costoEstimado?: string }): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  if (!input.tradeId) return { ok: false, error: 'Selecciona un oficio.' };
  if (!input.horasEstimadas || Number(input.horasEstimadas) <= 0) return { ok: false, error: 'Indica las horas estimadas.' };

  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.insert(planResources).values({ planId, tipo: 'MANO_OBRA', tradeId: input.tradeId, horasEstimadas: input.horasEstimadas, costoEstimado: input.costoEstimado || null });
  revalidatePath(`/planes/${planId}/recursos`);
  return { ok: true };
}

export async function agregarRecursoMaterial(planId: string, input: { materialId: string; cantidadEstimada: string; costoEstimado?: string }): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  if (!input.materialId) return { ok: false, error: 'Selecciona un material.' };
  if (!input.cantidadEstimada || Number(input.cantidadEstimada) <= 0) return { ok: false, error: 'Indica la cantidad estimada.' };

  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.insert(planResources).values({ planId, tipo: 'MATERIAL', materialId: input.materialId, cantidadEstimada: input.cantidadEstimada, costoEstimado: input.costoEstimado || null });
  revalidatePath(`/planes/${planId}/recursos`);
  return { ok: true };
}

export async function eliminarRecurso(planId: string, recursoId: string): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.delete(planResources).where(and(eq(planResources.id, recursoId), eq(planResources.planId, planId)));
  revalidatePath(`/planes/${planId}/recursos`);
  return { ok: true };
}

export async function obtenerOpcionesRecursos() {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  const [trds, mats] = await Promise.all([
    db.select({ value: trades.id, label: trades.nombre }).from(trades).where(and(eq(trades.tenantId, tenant.id), eq(trades.activo, true), isNull(trades.deletedAt))).orderBy(trades.nombre),
    db.select({ value: materials.id, label: materials.nombre, codigo: materials.codigo }).from(materials).where(and(eq(materials.tenantId, tenant.id), eq(materials.activo, true), isNull(materials.deletedAt))).orderBy(materials.nombre),
  ]);
  return { trades: trds, materials: mats };
}
