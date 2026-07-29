'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { materials, uoms, warehouseStock } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import {
  actualizarMaterialSchema,
  crearMaterialSchema,
  type ActualizarMaterialInput,
  type CrearMaterialInput,
  type MaterialFormValues,
} from '@/lib/validators/material';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

function datosDeFormulario(data: CrearMaterialInput) {
  return {
    codigo: data.codigo,
    nombre: data.nombre,
    descripcion: data.descripcion ?? null,
    tipo: data.tipo,
    uomId: data.uomId ?? null,
    categoria: data.categoria ?? null,
    critico: data.critico,
    manejaLote: data.manejaLote,
    manejaSerie: data.manejaSerie,
    activo: data.activo,
  };
}

export async function crearMaterial(input: CrearMaterialInput): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const parsed = crearMaterialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();

  try {
    const [fila] = await db
      .insert(materials)
      .values({ tenantId: tenant.id, ...datosDeFormulario(parsed.data) })
      .returning({ id: materials.id });

    const id = fila?.id;
    if (!id) return { ok: false, error: 'No se pudo crear el material.' };

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'almacen.materiales',
      entidadId: id,
      accion: 'INSERT',
      permiso: 'almacen.materiales.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(null, parsed.data),
    });

    revalidatePath('/almacen/materiales');
    return { ok: true, id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un material con ese código.' };
    console.error('[crearMaterial]', error);
    return { ok: false, error: 'No se pudo crear el material.' };
  }
}

export async function actualizarMaterial(input: ActualizarMaterialInput): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const parsed = actualizarMaterialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const data = parsed.data;
  const tenant = await getCurrentTenant();

  const [antes] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, data.id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .limit(1);
  if (!antes) return { ok: false, error: 'El material ya no existe.' };

  try {
    await db.update(materials).set(datosDeFormulario(data)).where(eq(materials.id, data.id));

    await writeAudit({
      tenantId: tenant.id,
      entidad: 'almacen.materiales',
      entidadId: data.id,
      accion: 'UPDATE',
      permiso: 'almacen.materiales.gestionar',
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: buildDiff(antes as unknown as Record<string, unknown>, parsed.data),
    });

    revalidatePath('/almacen/materiales');
    revalidatePath(`/almacen/materiales/${data.id}`);
    return { ok: true, id: data.id };
  } catch (error) {
    if (esViolacionDeUnicidad(error)) return { ok: false, error: 'Ya existe un material con ese código.' };
    console.error('[actualizarMaterial]', error);
    return { ok: false, error: 'No se pudo guardar el material.' };
  }
}

export async function eliminarMaterial(id: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const tenant = await getCurrentTenant();

  const tieneStock = await db
    .select({ id: warehouseStock.id })
    .from(warehouseStock)
    .where(eq(warehouseStock.materialId, id))
    .limit(1);
  if (tieneStock.length > 0) {
    return { ok: false, error: 'No puedes eliminar un material con existencias registradas en algún almacén.' };
  }

  const [fila] = await db
    .update(materials)
    .set({ deletedAt: new Date(), activo: false })
    .where(and(eq(materials.id, id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .returning({ id: materials.id, nombre: materials.nombre });

  if (!fila) return { ok: false, error: 'El material ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.materiales',
    entidadId: fila.id,
    accion: 'DELETE',
    nivel: 'CRITICO',
    permiso: 'almacen.materiales.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { eliminado: { antes: fila.nombre, despues: null } },
  });

  revalidatePath('/almacen/materiales');
  return { ok: true };
}

export async function obtenerMaterialParaEditar(id: string): Promise<MaterialFormValues | null> {
  await requirePermission('almacen.materiales.ver');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select()
    .from(materials)
    .where(and(eq(materials.id, id), eq(materials.tenantId, tenant.id), isNull(materials.deletedAt)))
    .limit(1);
  if (!fila) return null;

  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? undefined,
    tipo: fila.tipo,
    uomId: fila.uomId ?? undefined,
    categoria: fila.categoria ?? undefined,
    critico: fila.critico,
    manejaLote: fila.manejaLote,
    manejaSerie: fila.manejaSerie,
    activo: fila.activo,
  };
}

export async function obtenerOpcionesMaterial(): Promise<{ uoms: { value: string; label: string }[] }> {
  await requirePermission('almacen.materiales.ver');
  const tenant = await getCurrentTenant();

  const filas = await db
    .select({ value: uoms.id, label: uoms.nombre })
    .from(uoms)
    .where(and(eq(uoms.tenantId, tenant.id), eq(uoms.activo, true), isNull(uoms.deletedAt)))
    .orderBy(uoms.nombre);

  return { uoms: filas };
}
