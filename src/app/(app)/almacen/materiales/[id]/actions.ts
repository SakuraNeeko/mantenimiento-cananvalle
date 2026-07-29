'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { materialReferences, materials, parties, warehouseStock, warehouses } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

async function materialDelTenant(materialId: string, tenantId: string): Promise<boolean> {
  const [fila] = await db.select({ id: materials.id }).from(materials).where(and(eq(materials.id, materialId), eq(materials.tenantId, tenantId), isNull(materials.deletedAt))).limit(1);
  return Boolean(fila);
}

/* -------------------------------------------------------------------------- */
/* EXISTENCIAS POR ALMACÉN                                                    */
/* -------------------------------------------------------------------------- */

export async function obtenerExistencias(materialId: string) {
  await requirePermission('almacen.existencias.ver');
  const tenant = await getCurrentTenant();

  return db
    .select({
      id: warehouseStock.id,
      warehouseId: warehouseStock.warehouseId,
      warehouseNombre: warehouses.nombre,
      cantidad: warehouseStock.cantidad,
      minimo: warehouseStock.minimo,
      maximo: warehouseStock.maximo,
      puntoPedido: warehouseStock.puntoPedido,
      ubicacionEstante: warehouseStock.ubicacionEstante,
      costoPromedio: warehouseStock.costoPromedio,
    })
    .from(warehouseStock)
    .innerJoin(warehouses, eq(warehouses.id, warehouseStock.warehouseId))
    .where(and(eq(warehouseStock.materialId, materialId), eq(warehouseStock.tenantId, tenant.id)))
    .orderBy(warehouses.nombre);
}

export async function obtenerAlmacenesDisponibles(materialId: string) {
  await requirePermission('almacen.existencias.parametrizar');
  const tenant = await getCurrentTenant();

  const yaConfigurados = await db.select({ warehouseId: warehouseStock.warehouseId }).from(warehouseStock).where(eq(warehouseStock.materialId, materialId));
  const idsConfigurados = new Set(yaConfigurados.map((w) => w.warehouseId));

  const todos = await db
    .select({ value: warehouses.id, label: warehouses.nombre })
    .from(warehouses)
    .where(and(eq(warehouses.tenantId, tenant.id), eq(warehouses.activo, true), isNull(warehouses.deletedAt)))
    .orderBy(warehouses.nombre);

  return todos.filter((w) => !idsConfigurados.has(w.value));
}

/** Crea o ajusta los parámetros de existencia (mínimo/máximo/punto de pedido/ubicación) de un almacén para este material. */
export async function configurarExistencia(
  materialId: string,
  warehouseId: string,
  minimo: string,
  maximo: string,
  puntoPedido: string,
  ubicacionEstante: string,
): Promise<AccionResultado> {
  const session = await requirePermission('almacen.existencias.parametrizar');
  const tenant = await getCurrentTenant();
  if (!(await materialDelTenant(materialId, tenant.id))) return { ok: false, error: 'El material ya no existe.' };

  const valores = {
    minimo: minimo || null,
    maximo: maximo || null,
    puntoPedido: puntoPedido || null,
    ubicacionEstante: ubicacionEstante || null,
  };

  await db
    .insert(warehouseStock)
    .values({ tenantId: tenant.id, warehouseId, materialId, ...valores })
    .onConflictDoUpdate({ target: [warehouseStock.warehouseId, warehouseStock.materialId], set: valores });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.existencias',
    entidadId: materialId,
    accion: 'UPDATE',
    permiso: 'almacen.existencias.parametrizar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { parametros: { antes: null, despues: valores } },
  });

  revalidatePath(`/almacen/materiales/${materialId}`);
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* REFERENCIAS DE PROVEEDOR                                                   */
/* -------------------------------------------------------------------------- */

export async function obtenerReferenciasMaterial(materialId: string) {
  await requirePermission('almacen.materiales.ver');

  return db
    .select({
      id: materialReferences.id,
      partyNombre: parties.nombre,
      fabricante: materialReferences.fabricante,
      referenciaFabricante: materialReferences.referenciaFabricante,
      referenciaProveedor: materialReferences.referenciaProveedor,
      precio: materialReferences.precio,
      tiempoEntregaDias: materialReferences.tiempoEntregaDias,
    })
    .from(materialReferences)
    .leftJoin(parties, eq(parties.id, materialReferences.partyId))
    .where(and(eq(materialReferences.materialId, materialId), isNull(materialReferences.deletedAt)))
    .orderBy(materialReferences.createdAt);
}

export async function obtenerProveedoresDisponibles() {
  await requirePermission('almacen.materiales.gestionar');
  const tenant = await getCurrentTenant();
  return db
    .select({ value: parties.id, label: parties.nombre })
    .from(parties)
    .where(and(eq(parties.tenantId, tenant.id), eq(parties.activo, true), isNull(parties.deletedAt)))
    .orderBy(parties.nombre);
}

export async function crearReferenciaMaterial(
  materialId: string,
  partyId: string,
  fabricante: string,
  referenciaFabricante: string,
  referenciaProveedor: string,
  precio: string,
  tiempoEntregaDias: string,
): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const tenant = await getCurrentTenant();
  if (!(await materialDelTenant(materialId, tenant.id))) return { ok: false, error: 'El material ya no existe.' };

  await db.insert(materialReferences).values({
    tenantId: tenant.id,
    materialId,
    partyId: partyId || null,
    fabricante: fabricante || null,
    referenciaFabricante: referenciaFabricante || null,
    referenciaProveedor: referenciaProveedor || null,
    precio: precio || null,
    tiempoEntregaDias: tiempoEntregaDias ? Number(tiempoEntregaDias) : null,
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.materiales.referencias',
    entidadId: materialId,
    accion: 'INSERT',
    permiso: 'almacen.materiales.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { referencia: { antes: null, despues: referenciaProveedor || fabricante } },
  });

  revalidatePath(`/almacen/materiales/${materialId}`);
  return { ok: true };
}

export async function eliminarReferenciaMaterial(materialId: string, referenciaId: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.materiales.gestionar');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .update(materialReferences)
    .set({ deletedAt: new Date() })
    .where(and(eq(materialReferences.id, referenciaId), eq(materialReferences.tenantId, tenant.id), eq(materialReferences.materialId, materialId)))
    .returning({ id: materialReferences.id });
  if (!fila) return { ok: false, error: 'La referencia ya no existe.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.materiales.referencias',
    entidadId: materialId,
    accion: 'DELETE',
    permiso: 'almacen.materiales.gestionar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { referencia: { antes: referenciaId, despues: null } },
  });

  revalidatePath(`/almacen/materiales/${materialId}`);
  return { ok: true };
}
