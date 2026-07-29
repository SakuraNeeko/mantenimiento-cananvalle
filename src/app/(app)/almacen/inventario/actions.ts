'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { kardexConcepts, kardexMovementLines, kardexMovements, materials, physicalInventories, physicalInventoryLines, warehouseStock, warehouses } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { nextCode } from '@/lib/sequences';
import { aplicarLineaKardex, KardexError } from '../kardex/kardex-engine';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

/** Abre una toma física: fotografía la cantidad de sistema de todo lo que tenga existencia configurada en ese almacén. */
export async function crearInventarioFisico(warehouseId: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.inventario.ejecutar');
  const tenant = await getCurrentTenant();

  const existencias = await db.select({ materialId: warehouseStock.materialId, cantidad: warehouseStock.cantidad }).from(warehouseStock).where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.tenantId, tenant.id)));
  if (existencias.length === 0) {
    return { ok: false, error: 'Este almacén no tiene materiales con existencia configurada todavía.' };
  }

  const [inv] = await db.insert(physicalInventories).values({ tenantId: tenant.id, warehouseId, estado: 'BORRADOR', createdBy: session.user.id }).returning({ id: physicalInventories.id });
  const id = inv?.id;
  if (!id) return { ok: false, error: 'No se pudo abrir la toma física.' };

  await db.insert(physicalInventoryLines).values(existencias.map((e) => ({ inventoryId: id, materialId: e.materialId, cantidadSistema: e.cantidad })));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.inventario',
    entidadId: id,
    accion: 'INSERT',
    permiso: 'almacen.inventario.ejecutar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { toma: { antes: null, despues: `${existencias.length} materiales` } },
  });

  revalidatePath('/almacen/inventario');
  return { ok: true, id };
}

export async function guardarConteo(inventoryId: string, lineaId: string, cantidadContada: string): Promise<AccionResultado> {
  await requirePermission('almacen.inventario.ejecutar');
  const tenant = await getCurrentTenant();

  const [inv] = await db.select({ id: physicalInventories.id, estado: physicalInventories.estado }).from(physicalInventories).where(and(eq(physicalInventories.id, inventoryId), eq(physicalInventories.tenantId, tenant.id))).limit(1);
  if (!inv) return { ok: false, error: 'La toma física ya no existe.' };
  if (inv.estado !== 'BORRADOR') return { ok: false, error: 'Esta toma ya fue confirmada.' };

  await db.update(physicalInventoryLines).set({ cantidadContada: cantidadContada || null }).where(and(eq(physicalInventoryLines.id, lineaId), eq(physicalInventoryLines.inventoryId, inventoryId)));

  revalidatePath(`/almacen/inventario/${inventoryId}`);
  return { ok: true };
}

/**
 * Confirma la toma: por cada línea con diferencia entre lo contado y lo del
 * sistema, genera y confirma un movimiento de ajuste de kárdex (ENT-AJU o
 * SAL-AJU según el signo de la diferencia), usando el mismo motor
 * transaccional que un movimiento manual — el costo promedio también se
 * recalcula aquí, nunca aparte.
 */
export async function confirmarInventarioFisico(inventoryId: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.inventario.aprobar');
  const tenant = await getCurrentTenant();

  const [inv] = await db.select().from(physicalInventories).where(and(eq(physicalInventories.id, inventoryId), eq(physicalInventories.tenantId, tenant.id))).limit(1);
  if (!inv) return { ok: false, error: 'La toma física ya no existe.' };
  if (inv.estado !== 'BORRADOR') return { ok: false, error: 'Esta toma ya fue confirmada.' };

  const lineas = await db.select().from(physicalInventoryLines).where(eq(physicalInventoryLines.inventoryId, inventoryId));
  const conDiferencia = lineas.filter((l) => l.cantidadContada !== null && Number(l.cantidadContada) !== Number(l.cantidadSistema));

  if (conDiferencia.length === 0) {
    await db.update(physicalInventories).set({ estado: 'CONFIRMADO', confirmadoAt: new Date(), confirmadoBy: session.user.id }).where(eq(physicalInventories.id, inventoryId));
    revalidatePath(`/almacen/inventario/${inventoryId}`);
    return { ok: true, id: inventoryId };
  }

  const [entAjuste] = await db.select().from(kardexConcepts).where(and(eq(kardexConcepts.tenantId, tenant.id), eq(kardexConcepts.codigo, 'ENT-AJU'))).limit(1);
  const [salAjuste] = await db.select().from(kardexConcepts).where(and(eq(kardexConcepts.tenantId, tenant.id), eq(kardexConcepts.codigo, 'SAL-AJU'))).limit(1);
  if (!entAjuste || !salAjuste) {
    return { ok: false, error: 'Faltan los conceptos de kárdex "ENT-AJU" / "SAL-AJU" en Infraestructura → Conceptos de kárdex.' };
  }

  const materialesPorId = new Map((await db.select().from(materials).where(eq(materials.tenantId, tenant.id))).map((m) => [m.id, m]));

  try {
    await dbTx.transaction(async (tx) => {
      for (const linea of conDiferencia) {
        const material = materialesPorId.get(linea.materialId);
        if (!material) throw new KardexError('Material no encontrado.');

        const diferencia = Number(linea.cantidadContada) - Number(linea.cantidadSistema);
        const esEntrada = diferencia > 0;
        const concepto = esEntrada ? entAjuste : salAjuste;
        const consecutivo = await nextCode(tx, tenant.id, 'KX');

        const [mov] = await tx
          .insert(kardexMovements)
          .values({
            tenantId: tenant.id,
            consecutivo,
            kardexConceptId: concepto.id,
            warehouseId: inv.warehouseId,
            documentoSoporte: `Ajuste por inventario físico`,
            estado: 'CONFIRMADO',
            createdBy: session.user.id,
            confirmadoAt: new Date(),
            confirmadoBy: session.user.id,
          })
          .returning({ id: kardexMovements.id });
        const movId = mov?.id;
        if (!movId) throw new KardexError('No se pudo crear el movimiento de ajuste.');

        const resultado = await aplicarLineaKardex(tx, tenant.id, {
          warehouseId: inv.warehouseId,
          materialId: linea.materialId,
          cantidad: Math.abs(diferencia),
          costoUnitario: 0,
          lote: null,
          serie: null,
          fechaVencimiento: null,
          signo: esEntrada ? 'ENTRADA' : 'SALIDA',
          afectaCostoPromedio: concepto.afectaCostoPromedio,
          manejaLote: false,
        });

        await tx.insert(kardexMovementLines).values({
          movementId: movId,
          materialId: linea.materialId,
          cantidad: String(Math.abs(diferencia)),
          costoUnitario: resultado.costoUnitarioAplicado,
          costoTotal: resultado.costoTotal,
          saldoResultante: resultado.saldoResultante,
        });
      }

      await tx.update(physicalInventories).set({ estado: 'CONFIRMADO', confirmadoAt: new Date(), confirmadoBy: session.user.id }).where(eq(physicalInventories.id, inventoryId));
    });
  } catch (error) {
    if (error instanceof KardexError) return { ok: false, error: error.message };
    console.error('[confirmarInventarioFisico]', error);
    return { ok: false, error: 'No se pudo confirmar la toma física.' };
  }

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.inventario',
    entidadId: inventoryId,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: 'almacen.inventario.aprobar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: 'BORRADOR', despues: 'CONFIRMADO' }, ajustes: { antes: null, despues: conDiferencia.length } },
  });

  revalidatePath(`/almacen/inventario/${inventoryId}`);
  revalidatePath('/almacen/inventario');
  return { ok: true, id: inventoryId };
}

export async function obtenerInventarioFisico(id: string) {
  await requirePermission('almacen.inventario.ejecutar');
  const tenant = await getCurrentTenant();

  const [inv] = await db
    .select({ id: physicalInventories.id, fecha: physicalInventories.fecha, estado: physicalInventories.estado, warehouseId: physicalInventories.warehouseId, warehouseNombre: warehouses.nombre })
    .from(physicalInventories)
    .innerJoin(warehouses, eq(warehouses.id, physicalInventories.warehouseId))
    .where(and(eq(physicalInventories.id, id), eq(physicalInventories.tenantId, tenant.id)))
    .limit(1);
  if (!inv) return null;

  const lineas = await db
    .select({
      id: physicalInventoryLines.id,
      materialId: physicalInventoryLines.materialId,
      materialCodigo: materials.codigo,
      materialNombre: materials.nombre,
      cantidadSistema: physicalInventoryLines.cantidadSistema,
      cantidadContada: physicalInventoryLines.cantidadContada,
    })
    .from(physicalInventoryLines)
    .innerJoin(materials, eq(materials.id, physicalInventoryLines.materialId))
    .where(eq(physicalInventoryLines.inventoryId, id))
    .orderBy(materials.nombre);

  return { ...inv, lineas };
}

export async function obtenerAlmacenesParaInventario() {
  await requirePermission('almacen.inventario.ejecutar');
  const tenant = await getCurrentTenant();
  return db
    .select({ value: warehouses.id, label: warehouses.nombre })
    .from(warehouses)
    .where(and(eq(warehouses.tenantId, tenant.id), eq(warehouses.activo, true), isNull(warehouses.deletedAt)))
    .orderBy(warehouses.nombre);
}
