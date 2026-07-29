'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { otherCostConcepts, parties, woOtherCosts, woThirdPartyCosts, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';

export type AccionResultado = { ok: true } | { ok: false; error: string };

const ESTADOS_EDITABLES = ['ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA'];

async function ordenEditable(id: string, tenantId: string) {
  const [ot] = await db.select({ estado: workOrders.estado }).from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId))).limit(1);
  if (!ot) return { ok: false as const, error: 'La orden ya no existe.' };
  if (!ESTADOS_EDITABLES.includes(ot.estado)) return { ok: false as const, error: 'La orden ya no admite cambios en los costos.' };
  return { ok: true as const };
}

export async function agregarCostoTercero(ordenId: string, input: { partyId?: string; descripcion: string; monto: string }): Promise<AccionResultado> {
  await requirePermission('ordenes.costos.editar');
  if (!input.descripcion.trim()) return { ok: false, error: 'Describe el costo.' };
  if (!input.monto || Number(input.monto) <= 0) return { ok: false, error: 'Indica un monto válido.' };

  const tenant = await getCurrentTenant();
  const chequeo = await ordenEditable(ordenId, tenant.id);
  if (!chequeo.ok) return chequeo;

  await db.insert(woThirdPartyCosts).values({ workOrderId: ordenId, partyId: input.partyId || null, descripcion: input.descripcion, monto: input.monto });
  revalidatePath(`/ordenes/${ordenId}/costos`);
  return { ok: true };
}

export async function eliminarCostoTercero(ordenId: string, id: string): Promise<AccionResultado> {
  await requirePermission('ordenes.costos.editar');
  const tenant = await getCurrentTenant();
  const chequeo = await ordenEditable(ordenId, tenant.id);
  if (!chequeo.ok) return chequeo;

  await db.delete(woThirdPartyCosts).where(and(eq(woThirdPartyCosts.id, id), eq(woThirdPartyCosts.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/costos`);
  return { ok: true };
}

export async function agregarCostoOtro(ordenId: string, input: { otherCostConceptId?: string; descripcion: string; monto: string }): Promise<AccionResultado> {
  await requirePermission('ordenes.costos.editar');
  if (!input.descripcion.trim()) return { ok: false, error: 'Describe el costo.' };
  if (!input.monto || Number(input.monto) <= 0) return { ok: false, error: 'Indica un monto válido.' };

  const tenant = await getCurrentTenant();
  const chequeo = await ordenEditable(ordenId, tenant.id);
  if (!chequeo.ok) return chequeo;

  await db.insert(woOtherCosts).values({ workOrderId: ordenId, otherCostConceptId: input.otherCostConceptId || null, descripcion: input.descripcion, monto: input.monto });
  revalidatePath(`/ordenes/${ordenId}/costos`);
  return { ok: true };
}

export async function eliminarCostoOtro(ordenId: string, id: string): Promise<AccionResultado> {
  await requirePermission('ordenes.costos.editar');
  const tenant = await getCurrentTenant();
  const chequeo = await ordenEditable(ordenId, tenant.id);
  if (!chequeo.ok) return chequeo;

  await db.delete(woOtherCosts).where(and(eq(woOtherCosts.id, id), eq(woOtherCosts.workOrderId, ordenId)));
  revalidatePath(`/ordenes/${ordenId}/costos`);
  return { ok: true };
}

export async function obtenerOpcionesCostos() {
  await requirePermission('ordenes.costos.editar');
  const tenant = await getCurrentTenant();
  const [partiesRows, conceptosRows] = await Promise.all([
    db.select({ value: parties.id, label: parties.nombre }).from(parties).where(and(eq(parties.tenantId, tenant.id), eq(parties.activo, true), isNull(parties.deletedAt))).orderBy(parties.nombre),
    db
      .select({ value: otherCostConcepts.id, label: otherCostConcepts.nombre })
      .from(otherCostConcepts)
      .where(and(eq(otherCostConcepts.tenantId, tenant.id), eq(otherCostConcepts.activo, true), isNull(otherCostConcepts.deletedAt)))
      .orderBy(otherCostConcepts.nombre),
  ]);
  return { parties: partiesRows, conceptos: conceptosRows };
}
