'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { magnitudes, maintenancePlans, meters, planTriggers } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { triggerBaseSchema, type TriggerFormValues } from '@/lib/validators/plan';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

async function planExiste(planId: string, tenantId: string) {
  const [plan] = await db.select({ id: maintenancePlans.id }).from(maintenancePlans).where(and(eq(maintenancePlans.id, planId), eq(maintenancePlans.tenantId, tenantId), isNull(maintenancePlans.deletedAt))).limit(1);
  return Boolean(plan);
}

export async function agregarTrigger(planId: string, input: TriggerFormValues): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  const parsed = triggerBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  const [fila] = await db
    .insert(planTriggers)
    .values({
      planId,
      tipo: parsed.data.tipo,
      modoReprogramacion: parsed.data.modoReprogramacion,
      diasAnticipacion: parsed.data.diasAnticipacion,
      intervaloValor: parsed.data.intervaloValor ? Number(parsed.data.intervaloValor) : null,
      intervaloUnidad: parsed.data.intervaloUnidad ?? null,
      fechaBase: parsed.data.fechaBase ?? null,
      meterId: parsed.data.meterId ?? null,
      intervaloContador: parsed.data.intervaloContador ?? null,
      umbralAviso: parsed.data.umbralAviso ?? null,
    })
    .returning({ id: planTriggers.id });

  revalidatePath(`/planes/${planId}/disparadores`);
  return { ok: true, id: fila?.id };
}

export async function eliminarTrigger(planId: string, triggerId: string): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.update(planTriggers).set({ deletedAt: new Date(), activo: false }).where(and(eq(planTriggers.id, triggerId), eq(planTriggers.planId, planId)));
  revalidatePath(`/planes/${planId}/disparadores`);
  return { ok: true };
}

export async function alternarTrigger(planId: string, triggerId: string, activo: boolean): Promise<AccionResultado> {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await planExiste(planId, tenant.id))) return { ok: false, error: 'El plan ya no existe.' };

  await db.update(planTriggers).set({ activo }).where(and(eq(planTriggers.id, triggerId), eq(planTriggers.planId, planId)));
  revalidatePath(`/planes/${planId}/disparadores`);
  return { ok: true };
}

export async function obtenerOpcionesTrigger() {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  const [mtrs, mgns] = await Promise.all([
    db.select({ value: meters.id, label: meters.nombre }).from(meters).where(and(eq(meters.tenantId, tenant.id), eq(meters.activo, true), isNull(meters.deletedAt))).orderBy(meters.nombre),
    db.select({ value: magnitudes.id, label: magnitudes.nombre }).from(magnitudes).where(and(eq(magnitudes.tenantId, tenant.id), eq(magnitudes.activo, true), isNull(magnitudes.deletedAt))).orderBy(magnitudes.nombre),
  ]);
  return { meters: mtrs, magnitudes: mgns };
}
