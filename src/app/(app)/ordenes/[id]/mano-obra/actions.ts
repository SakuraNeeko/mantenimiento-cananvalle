'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { responsibles, woLabor, workOrders } from '@/db/schema';
import { hasAny, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'];

/**
 * Costo simplificado (deuda técnica, ver ENTREGA-FASE-6.md): todas las
 * horas se valoran a `responsibles.costo_hora`, sin recargo por
 * hora extra/nocturna — el prompt maestro no define esos factores.
 */
export async function agregarManoObra(
  ordenId: string,
  input: { responsibleId: string; fecha: string; horasNormales: string; horasExtras: string; horasNocturnas: string },
): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ver');
  if (!hasAny(session, ['ordenes.mano_obra.propia', 'ordenes.mano_obra.terceros'])) return { ok: false, error: 'No tienes permiso para registrar mano de obra.' };
  if (!input.responsibleId) return { ok: false, error: 'Selecciona un responsable.' };
  if (!input.fecha) return { ok: false, error: 'Indica la fecha.' };

  const tenant = await getCurrentTenant();
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, ordenId), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite registrar mano de obra.' };

  const [responsable] = await db.select({ costoHora: responsibles.costoHora }).from(responsibles).where(eq(responsibles.id, input.responsibleId)).limit(1);
  if (!responsable) return { ok: false, error: 'Responsable no encontrado.' };

  const horas = Number(input.horasNormales || 0) + Number(input.horasExtras || 0) + Number(input.horasNocturnas || 0);
  if (horas <= 0) return { ok: false, error: 'Registra al menos una hora.' };
  const costoCalculado = horas * Number(responsable.costoHora);

  await db.insert(woLabor).values({
    workOrderId: ordenId,
    responsibleId: input.responsibleId,
    fecha: input.fecha,
    horasNormales: input.horasNormales || '0',
    horasExtras: input.horasExtras || '0',
    horasNocturnas: input.horasNocturnas || '0',
    costoCalculado: String(costoCalculado),
  });

  revalidatePath(`/ordenes/${ordenId}/mano-obra`);
  return { ok: true };
}

export async function eliminarManoObra(ordenId: string, laborId: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ver');
  if (!hasAny(session, ['ordenes.mano_obra.propia', 'ordenes.mano_obra.terceros'])) return { ok: false, error: 'No tienes permiso para editar mano de obra.' };
  const tenant = await getCurrentTenant();
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, ordenId), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false, error: 'La orden ya no admite cambios en la mano de obra.' };

  await db.delete(woLabor).where(and(eq(woLabor.id, laborId), eq(woLabor.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/mano-obra`);
  return { ok: true };
}

export async function obtenerResponsablesDisponibles() {
  await requirePermission('ordenes.ver');
  const tenant = await getCurrentTenant();
  return db
    .select({ value: responsibles.id, label: responsibles.nombre, costoHora: responsibles.costoHora })
    .from(responsibles)
    .where(and(eq(responsibles.tenantId, tenant.id), eq(responsibles.activo, true)))
    .orderBy(responsibles.nombre);
}
