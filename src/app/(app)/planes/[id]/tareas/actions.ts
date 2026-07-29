'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { maintenancePlans, planTasks, trades } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

async function planExiste(planId: string, tenantId: string) {
  const [plan] = await db.select({ id: maintenancePlans.id }).from(maintenancePlans).where(and(eq(maintenancePlans.id, planId), eq(maintenancePlans.tenantId, tenantId), isNull(maintenancePlans.deletedAt))).limit(1);
  return Boolean(plan);
}

export async function agregarTareaPlan(
  planId: string,
  input: { descripcion: string; tipoRespuesta: (typeof planTasks.$inferSelect)['tipoRespuesta']; esCritica: boolean; tradeId?: string; duracionMinutos?: string },
): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  if (!input.descripcion.trim()) return { ok: false, error: 'Describe la tarea.' };

  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  const [fila] = await db.select({ n: count() }).from(planTasks).where(eq(planTasks.planId, planId));
  await db.insert(planTasks).values({
    planId,
    orden: (fila?.n ?? 0) + 1,
    descripcion: input.descripcion,
    tipoRespuesta: input.tipoRespuesta,
    esCritica: input.esCritica,
    tradeId: input.tradeId || null,
    duracionMinutos: input.duracionMinutos ? Number(input.duracionMinutos) : null,
  });

  revalidatePath(`/planes/${planId}/tareas`);
  return { ok: true };
}

export async function eliminarTareaPlan(planId: string, tareaId: string): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.delete(planTasks).where(and(eq(planTasks.id, tareaId), eq(planTasks.planId, planId)));
  revalidatePath(`/planes/${planId}/tareas`);
  return { ok: true };
}

export async function obtenerOficios() {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  return db.select({ value: trades.id, label: trades.nombre }).from(trades).where(and(eq(trades.tenantId, tenant.id), eq(trades.activo, true), isNull(trades.deletedAt))).orderBy(trades.nombre);
}
