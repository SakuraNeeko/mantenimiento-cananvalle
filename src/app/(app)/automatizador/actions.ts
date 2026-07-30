'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { automationRules, automationRuns, users } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildDiff, writeAudit } from '@/lib/audit';
import type { AccionRegla, CondicionesRegla } from '@/lib/automatizador/reglas';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

export type ReglaFormValues = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  disparadorTipo: string;
  umbral?: number;
  condiciones: CondicionesRegla;
  acciones: AccionRegla[];
};

export async function crearRegla(input: ReglaFormValues): Promise<AccionResultado> {
  const session = await requirePermission('automatizador.gestionar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'automatizador');

  if (!input.nombre.trim() || !input.codigo.trim()) return { ok: false, error: 'Código y nombre son obligatorios.' };

  try {
    const [fila] = await db
      .insert(automationRules)
      .values({
        tenantId: tenant.id,
        codigo: input.codigo.trim(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion || null,
        activo: input.activo,
        disparadorTipo: input.disparadorTipo as (typeof automationRules.$inferInsert)['disparadorTipo'],
        umbral: input.umbral ?? null,
        condiciones: input.condiciones,
        acciones: input.acciones,
      })
      .returning({ id: automationRules.id });

    if (!fila) return { ok: false, error: 'No se pudo crear la regla.' };

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'automatizador.reglas',
      entidadId: fila.id,
      accion: 'INSERT',
      nivel: 'CRITICO',
      permiso: 'automatizador.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, input),
    });

    revalidatePath('/automatizador');
    return { ok: true, id: fila.id };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505') {
      return { ok: false, error: 'Ya existe una regla con ese código.' };
    }
    console.error('[crearRegla]', error);
    return { ok: false, error: 'No se pudo crear la regla.' };
  }
}

export async function actualizarRegla(id: string, input: ReglaFormValues): Promise<AccionResultado> {
  const session = await requirePermission('automatizador.gestionar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'automatizador');

  const [antes] = await db.select().from(automationRules).where(and(eq(automationRules.id, id), eq(automationRules.tenantId, tenant.id))).limit(1);
  if (!antes) return { ok: false, error: 'La regla ya no existe.' };

  await db
    .update(automationRules)
    .set({
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion || null,
      activo: input.activo,
      disparadorTipo: input.disparadorTipo as (typeof automationRules.$inferInsert)['disparadorTipo'],
      umbral: input.umbral ?? null,
      condiciones: input.condiciones,
      acciones: input.acciones,
    })
    .where(eq(automationRules.id, id));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'automatizador.reglas',
    entidadId: id,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: 'automatizador.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: buildDiff(antes as unknown as Record<string, unknown>, input),
  });

  revalidatePath('/automatizador');
  return { ok: true, id };
}

export async function eliminarRegla(id: string): Promise<AccionResultado> {
  const session = await requirePermission('automatizador.gestionar');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .update(automationRules)
    .set({ deletedAt: new Date(), activo: false })
    .where(and(eq(automationRules.id, id), eq(automationRules.tenantId, tenant.id), isNull(automationRules.deletedAt)))
    .returning({ id: automationRules.id });
  if (!fila) return { ok: false, error: 'La regla ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'automatizador.reglas',
    entidadId: id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'automatizador.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminada: { antes: id, despues: null } },
  });

  revalidatePath('/automatizador');
  return { ok: true };
}

export async function alternarActivoRegla(id: string, activo: boolean): Promise<AccionResultado> {
  await requirePermission('automatizador.gestionar');
  const tenant = await getCurrentTenant();
  const [fila] = await db.update(automationRules).set({ activo }).where(and(eq(automationRules.id, id), eq(automationRules.tenantId, tenant.id))).returning({ id: automationRules.id });
  if (!fila) return { ok: false, error: 'La regla ya no existe.' };
  revalidatePath('/automatizador');
  return { ok: true };
}

export async function obtenerUsuariosParaAutomatizador(): Promise<{ value: string; label: string }[]> {
  await requirePermission('automatizador.gestionar');
  const tenant = await getCurrentTenant();
  const filas = await db.select({ id: users.id, nombre: users.nombre }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.activo, true))).orderBy(users.nombre);
  return filas.map((f) => ({ value: f.id, label: f.nombre }));
}

export async function obtenerBitacoraRegla(reglaId: string) {
  await requirePermission('automatizador.bitacora.ver');
  const tenant = await getCurrentTenant();
  return db
    .select({
      id: automationRuns.id,
      entidad: automationRuns.entidad,
      entidadId: automationRuns.entidadId,
      resultado: automationRuns.resultado,
      detalle: automationRuns.detalle,
      duracionMs: automationRuns.duracionMs,
      createdAt: automationRuns.createdAt,
    })
    .from(automationRuns)
    .where(and(eq(automationRuns.ruleId, reglaId), eq(automationRuns.tenantId, tenant.id)))
    .orderBy(desc(automationRuns.createdAt))
    .limit(100);
}
