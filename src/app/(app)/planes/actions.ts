'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  assetClasses,
  assets,
  locations,
  maintenancePlans,
  maintenanceTypes,
  planGenerationLog,
  responsibles,
  workOrders,
  workTypes,
} from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { planBaseSchema, type PlanFormValues } from '@/lib/validators/plan';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function datosDeFormulario(data: PlanFormValues) {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    maintenanceTypeId: data.maintenanceTypeId ?? null,
    workTypeId: data.workTypeId ?? null,
    alcance: data.alcance,
    assetId: data.alcance === 'ACTIVO_UNICO' ? (data.assetId ?? null) : null,
    claseFiltroId: data.alcance === 'GRUPO' ? (data.claseFiltroId ?? null) : null,
    criticidadFiltro: data.alcance === 'GRUPO' ? ((data.criticidadFiltro as never) ?? null) : null,
    locationFiltro: data.alcance === 'GRUPO' ? (data.locationFiltro ?? null) : null,
    responsibleDefaultId: data.responsibleDefaultId ?? null,
    prioridad: data.prioridad,
    tiempoEstimadoHoras: data.tiempoEstimadoHoras ?? null,
    instrucciones: data.instrucciones ?? null,
  };
}

export async function crearPlan(input: PlanFormValues): Promise<AccionResultado> {
  const session = await requirePermission('planes.gestionar');
  const parsed = planBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [existe] = await db
    .select({ id: maintenancePlans.id })
    .from(maintenancePlans)
    .where(and(eq(maintenancePlans.tenantId, tenant.id), eq(maintenancePlans.codigo, parsed.data.codigo), isNull(maintenancePlans.deletedAt)))
    .limit(1);
  if (existe) return { ok: false, error: `Ya existe un plan con el código "${parsed.data.codigo}".` };

  const [fila] = await db
    .insert(maintenancePlans)
    .values({ tenantId: tenant.id, ...datosDeFormulario(parsed.data) })
    .returning({ id: maintenancePlans.id });

  const id = fila?.id;
  if (!id) return { ok: false, error: 'No se pudo crear el plan.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'planes', entidadId: id, accion: 'INSERT', permiso: 'planes.gestionar', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/planes');
  return { ok: true, id };
}

export async function actualizarPlan(id: string, input: PlanFormValues): Promise<AccionResultado> {
  const session = await requirePermission('planes.gestionar');
  const parsed = planBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [plan] = await db.select().from(maintenancePlans).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenant.id), isNull(maintenancePlans.deletedAt))).limit(1);
  if (!plan) return { ok: false, error: 'El plan ya no existe.' };

  if (parsed.data.codigo !== plan.codigo) {
    const [existe] = await db
      .select({ id: maintenancePlans.id })
      .from(maintenancePlans)
      .where(and(eq(maintenancePlans.tenantId, tenant.id), eq(maintenancePlans.codigo, parsed.data.codigo), isNull(maintenancePlans.deletedAt)))
      .limit(1);
    if (existe) return { ok: false, error: `Ya existe un plan con el código "${parsed.data.codigo}".` };
  }

  await db.update(maintenancePlans).set(datosDeFormulario(parsed.data)).where(eq(maintenancePlans.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'planes', entidadId: id, accion: 'UPDATE', permiso: 'planes.gestionar', userId: session.user.id, diff: buildDiff(plan as unknown as Record<string, unknown>, parsed.data) });

  revalidatePath(`/planes/${id}`);
  revalidatePath('/planes');
  return { ok: true, id };
}

export async function eliminarPlan(id: string): Promise<AccionResultado> {
  const session = await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  const [plan] = await db.select().from(maintenancePlans).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenant.id), isNull(maintenancePlans.deletedAt))).limit(1);
  if (!plan) return { ok: false, error: 'El plan ya no existe.' };

  const [tieneHistorial] = await db.select({ id: planGenerationLog.id }).from(planGenerationLog).where(eq(planGenerationLog.planId, id)).limit(1);
  if (tieneHistorial) return { ok: false, error: 'Este plan ya generó órdenes de trabajo: desactívalo en vez de eliminarlo, para no perder la trazabilidad.' };

  await db.update(maintenancePlans).set({ deletedAt: new Date(), activo: false }).where(eq(maintenancePlans.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'planes', entidadId: id, accion: 'DELETE', nivel: 'CRITICO', permiso: 'planes.gestionar', userId: session.user.id });
  revalidatePath('/planes');
  return { ok: true };
}

export async function activarPlan(id: string): Promise<AccionResultado> {
  const session = await requirePermission('planes.activar');
  const tenant = await getCurrentTenant();
  await db.update(maintenancePlans).set({ activo: true }).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenant.id)));
  await writeAudit({ tenantId: tenant.id, entidad: 'planes', entidadId: id, accion: 'UPDATE', nivel: 'CRITICO', permiso: 'planes.activar', userId: session.user.id, diff: { activo: { antes: false, despues: true } } });
  revalidatePath(`/planes/${id}`);
  revalidatePath('/planes');
  return { ok: true, id };
}

export async function desactivarPlan(id: string): Promise<AccionResultado> {
  const session = await requirePermission('planes.activar');
  const tenant = await getCurrentTenant();
  await db.update(maintenancePlans).set({ activo: false }).where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenant.id)));
  await writeAudit({ tenantId: tenant.id, entidad: 'planes', entidadId: id, accion: 'UPDATE', nivel: 'CRITICO', permiso: 'planes.activar', userId: session.user.id, diff: { activo: { antes: true, despues: false } } });
  revalidatePath(`/planes/${id}`);
  revalidatePath('/planes');
  return { ok: true, id };
}

export type OpcionesPlan = {
  clases: { value: string; label: string }[];
  maintenanceTypes: { value: string; label: string }[];
  workTypes: { value: string; label: string }[];
  assets: { value: string; label: string }[];
  locations: { value: string; label: string }[];
  responsables: { value: string; label: string }[];
};

export async function obtenerOpcionesPlan(): Promise<OpcionesPlan> {
  await requirePermission('planes.gestionar');
  const tenant = await getCurrentTenant();
  const activo = <T extends { tenantId: unknown; activo: unknown; deletedAt: unknown }>(t: T) => and(eq(t.tenantId as never, tenant.id), eq(t.activo as never, true), isNull(t.deletedAt as never));

  const [cls, mts, wts, ast, locs, resp] = await Promise.all([
    db.select({ value: assetClasses.id, label: assetClasses.nombre }).from(assetClasses).where(activo(assetClasses)).orderBy(assetClasses.nombre),
    db.select({ value: maintenanceTypes.id, label: maintenanceTypes.nombre }).from(maintenanceTypes).where(activo(maintenanceTypes)).orderBy(maintenanceTypes.nombre),
    db.select({ value: workTypes.id, label: workTypes.nombre }).from(workTypes).where(activo(workTypes)).orderBy(workTypes.nombre),
    db.select({ value: assets.id, label: assets.nombre }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    db.select({ value: locations.id, label: locations.nombre }).from(locations).where(activo(locations)).orderBy(locations.nombre),
    db.select({ value: responsibles.id, label: responsibles.nombre }).from(responsibles).where(activo(responsibles)).orderBy(responsibles.nombre),
  ]);

  return { clases: cls, maintenanceTypes: mts, workTypes: wts, assets: ast, locations: locs, responsables: resp };
}

export async function obtenerHistorialGeneracion(planId: string) {
  await requirePermission('planes.ver');
  return db
    .select({
      id: planGenerationLog.id,
      resultado: planGenerationLog.resultado,
      fechaEvaluacion: planGenerationLog.fechaEvaluacion,
      fechaProyectada: planGenerationLog.fechaProyectada,
      detalle: planGenerationLog.detalle,
      assetNombre: assets.nombre,
      workOrderId: planGenerationLog.workOrderId,
      workOrderConsecutivo: workOrders.consecutivo,
    })
    .from(planGenerationLog)
    .leftJoin(assets, eq(assets.id, planGenerationLog.assetId))
    .leftJoin(workOrders, eq(workOrders.id, planGenerationLog.workOrderId))
    .where(eq(planGenerationLog.planId, planId))
    .orderBy(planGenerationLog.fechaEvaluacion);
}
