'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { woTasks, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

const ESTADOS_EDITABLES = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

async function ordenEditable(id: string, tenantId: string) {
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId))).limit(1);
  return ot ?? null;
}

export async function agregarTarea(ordenId: string, descripcion: string, tipoRespuesta: (typeof woTasks.$inferSelect)['tipoRespuesta'], esCritica: boolean): Promise<AccionResultado> {
  await requirePermission('ordenes.tareas.registrar');
  if (!descripcion.trim()) return { ok: false, error: 'Describe la tarea.' };
  const tenant = await getCurrentTenant();
  const ot = await ordenEditable(ordenId, tenant.id);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite cambios en el checklist.' };

  const [fila] = await db.select({ n: count() }).from(woTasks).where(eq(woTasks.workOrderId, ordenId));
  await db.insert(woTasks).values({ workOrderId: ordenId, orden: (fila?.n ?? 0) + 1, descripcion, tipoRespuesta, esCritica });

  revalidatePath(`/ordenes/${ordenId}/tareas`);
  return { ok: true };
}

export async function eliminarTarea(ordenId: string, tareaId: string): Promise<AccionResultado> {
  await requirePermission('ordenes.tareas.registrar');
  const tenant = await getCurrentTenant();
  const ot = await ordenEditable(ordenId, tenant.id);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite cambios en el checklist.' };

  await db.delete(woTasks).where(and(eq(woTasks.id, tareaId), eq(woTasks.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/tareas`);
  return { ok: true };
}

export async function completarTarea(
  ordenId: string,
  tareaId: string,
  datos: { resultado?: string; valorMedido?: string; observacion?: string },
): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.tareas.registrar');
  const tenant = await getCurrentTenant();
  const ot = await ordenEditable(ordenId, tenant.id);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'EN_EJECUCION') return { ok: false, error: 'Solo se puede completar el checklist mientras la orden está en ejecución.' };

  await db
    .update(woTasks)
    .set({ resultado: datos.resultado || null, valorMedido: datos.valorMedido || null, observacion: datos.observacion || null, completadaAt: new Date(), completadaBy: session.user.id })
    .where(and(eq(woTasks.id, tareaId), eq(woTasks.workOrderId, ordenId)));

  revalidatePath(`/ordenes/${ordenId}/tareas`);
  return { ok: true };
}

export async function reabrirTarea(ordenId: string, tareaId: string): Promise<AccionResultado> {
  await requirePermission('ordenes.tareas.registrar');
  const tenant = await getCurrentTenant();
  const ot = await ordenEditable(ordenId, tenant.id);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'EN_EJECUCION') return { ok: false, error: 'Solo se puede reabrir mientras la orden está en ejecución.' };

  await db.update(woTasks).set({ completadaAt: null, completadaBy: null }).where(and(eq(woTasks.id, tareaId), eq(woTasks.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/tareas`);
  return { ok: true };
}
