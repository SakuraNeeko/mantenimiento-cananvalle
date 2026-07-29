'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { kardexConcepts, kardexMovementLines, kardexMovements, materials, parties, uoms, warehouses } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';
import { nextCode } from '@/lib/sequences';
import { aplicarLineaKardex, KardexError, signoOpuesto } from './kardex-engine';
import { movimientoSchema, type MovimientoInput } from './validators';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function permisoDeCreacion(signo: 'ENTRADA' | 'SALIDA'): 'almacen.kardex.entrada' | 'almacen.kardex.salida' {
  return signo === 'ENTRADA' ? 'almacen.kardex.entrada' : 'almacen.kardex.salida';
}

async function guardarLineas(movementId: string, lineas: MovimientoInput['lineas']): Promise<void> {
  await db.delete(kardexMovementLines).where(eq(kardexMovementLines.movementId, movementId));
  await db.insert(kardexMovementLines).values(
    lineas.map((l) => ({
      movementId,
      materialId: l.materialId,
      cantidad: l.cantidad,
      costoUnitario: l.costoUnitario || '0',
      costoTotal: String(Number(l.cantidad) * Number(l.costoUnitario || '0')),
      lote: l.lote || null,
      serie: l.serie || null,
      fechaVencimiento: l.fechaVencimiento || null,
    })),
  );
}

export async function crearMovimiento(input: MovimientoInput): Promise<AccionResultado> {
  const parsed = movimientoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const data = parsed.data;
  const tenant = await getCurrentTenant();

  const [concepto] = await db.select().from(kardexConcepts).where(and(eq(kardexConcepts.id, data.kardexConceptId), eq(kardexConcepts.tenantId, tenant.id))).limit(1);
  if (!concepto) return { ok: false, error: 'Concepto inválido.' };

  const session = await requirePermission(permisoDeCreacion(concepto.signo));

  if (concepto.exigeTercero && !data.partyId) return { ok: false, error: 'Este concepto exige seleccionar un tercero.' };
  if (concepto.exigeOt && !data.documentoSoporte) return { ok: false, error: 'Este concepto exige un documento de soporte (ej. la OT).' };

  const [mov] = await db
    .insert(kardexMovements)
    .values({
      tenantId: tenant.id,
      kardexConceptId: data.kardexConceptId,
      warehouseId: data.warehouseId,
      partyId: data.partyId || null,
      documentoSoporte: data.documentoSoporte || null,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
      estado: 'BORRADOR',
      createdBy: session.user.id,
    })
    .returning({ id: kardexMovements.id });

  const id = mov?.id;
  if (!id) return { ok: false, error: 'No se pudo crear el movimiento.' };

  await guardarLineas(id, data.lineas);

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.kardex',
    entidadId: id,
    accion: 'INSERT',
    permiso: permisoDeCreacion(concepto.signo),
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { movimiento: { antes: null, despues: `${concepto.codigo} · ${data.lineas.length} líneas` } },
  });

  revalidatePath('/almacen/kardex');
  return { ok: true, id };
}

export async function actualizarMovimiento(id: string, input: MovimientoInput): Promise<AccionResultado> {
  const parsed = movimientoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  const data = parsed.data;
  const tenant = await getCurrentTenant();

  const [mov] = await db.select().from(kardexMovements).where(and(eq(kardexMovements.id, id), eq(kardexMovements.tenantId, tenant.id))).limit(1);
  if (!mov) return { ok: false, error: 'El movimiento ya no existe.' };
  if (mov.estado !== 'BORRADOR') return { ok: false, error: 'Solo se pueden editar movimientos en borrador.' };

  const [concepto] = await db.select().from(kardexConcepts).where(eq(kardexConcepts.id, data.kardexConceptId)).limit(1);
  if (!concepto) return { ok: false, error: 'Concepto inválido.' };

  const session = await requirePermission(permisoDeCreacion(concepto.signo));

  if (concepto.exigeTercero && !data.partyId) return { ok: false, error: 'Este concepto exige seleccionar un tercero.' };
  if (concepto.exigeOt && !data.documentoSoporte) return { ok: false, error: 'Este concepto exige un documento de soporte (ej. la OT).' };

  await db
    .update(kardexMovements)
    .set({
      kardexConceptId: data.kardexConceptId,
      warehouseId: data.warehouseId,
      partyId: data.partyId || null,
      documentoSoporte: data.documentoSoporte || null,
      fecha: data.fecha ? new Date(data.fecha) : mov.fecha,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(kardexMovements.id, id));

  await guardarLineas(id, data.lineas);

  revalidatePath(`/almacen/kardex/${id}`);
  revalidatePath('/almacen/kardex');
  return { ok: true, id };
}

export async function eliminarMovimiento(id: string): Promise<AccionResultado> {
  const tenant = await getCurrentTenant();
  const [mov] = await db.select().from(kardexMovements).where(and(eq(kardexMovements.id, id), eq(kardexMovements.tenantId, tenant.id))).limit(1);
  if (!mov) return { ok: false, error: 'El movimiento ya no existe.' };
  if (mov.estado !== 'BORRADOR') return { ok: false, error: 'Solo se pueden eliminar movimientos en borrador.' };

  const [concepto] = await db.select().from(kardexConcepts).where(eq(kardexConcepts.id, mov.kardexConceptId)).limit(1);
  await requirePermission(concepto ? permisoDeCreacion(concepto.signo) : 'almacen.kardex.entrada');

  await db.delete(kardexMovements).where(eq(kardexMovements.id, id));
  revalidatePath('/almacen/kardex');
  return { ok: true };
}

/**
 * Confirmar: recalcula el costo promedio ponderado y actualiza existencias
 * dentro de la MISMA transacción — la regla de oro del §4.4. Vuelve el
 * movimiento inmutable.
 */
export async function confirmarMovimiento(id: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.kardex.confirmar');
  const tenant = await getCurrentTenant();

  const [mov] = await db.select().from(kardexMovements).where(and(eq(kardexMovements.id, id), eq(kardexMovements.tenantId, tenant.id))).limit(1);
  if (!mov) return { ok: false, error: 'El movimiento ya no existe.' };
  if (mov.estado !== 'BORRADOR') return { ok: false, error: 'Solo se pueden confirmar movimientos en borrador.' };

  const [concepto] = await db.select().from(kardexConcepts).where(eq(kardexConcepts.id, mov.kardexConceptId)).limit(1);
  if (!concepto) return { ok: false, error: 'Concepto inválido.' };

  const lineas = await db.select().from(kardexMovementLines).where(eq(kardexMovementLines.movementId, id));
  if (lineas.length === 0) return { ok: false, error: 'El movimiento no tiene líneas.' };

  const materialesPorId = new Map((await db.select().from(materials).where(inArray(materials.id, lineas.map((l) => l.materialId)))).map((m) => [m.id, m]));

  try {
    await dbTx.transaction(async (tx) => {
      const consecutivo = await nextCode(tx, tenant.id, 'KX');

      for (const linea of lineas) {
        const material = materialesPorId.get(linea.materialId);
        if (!material) throw new KardexError(`Material no encontrado para la línea.`);

        const resultado = await aplicarLineaKardex(tx, tenant.id, {
          warehouseId: mov.warehouseId,
          materialId: linea.materialId,
          cantidad: Number(linea.cantidad),
          costoUnitario: Number(linea.costoUnitario),
          lote: linea.lote,
          serie: linea.serie,
          fechaVencimiento: linea.fechaVencimiento,
          signo: concepto.signo,
          afectaCostoPromedio: concepto.afectaCostoPromedio,
          manejaLote: material.manejaLote,
        });

        await tx
          .update(kardexMovementLines)
          .set({ costoUnitario: resultado.costoUnitarioAplicado, costoTotal: resultado.costoTotal, saldoResultante: resultado.saldoResultante, lote: resultado.loteAplicado })
          .where(eq(kardexMovementLines.id, linea.id));
      }

      await tx.update(kardexMovements).set({ estado: 'CONFIRMADO', consecutivo, confirmadoAt: new Date(), confirmadoBy: session.user.id }).where(eq(kardexMovements.id, id));
    });
  } catch (error) {
    if (error instanceof KardexError) return { ok: false, error: error.message };
    console.error('[confirmarMovimiento]', error);
    return { ok: false, error: 'No se pudo confirmar el movimiento.' };
  }

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.kardex',
    entidadId: id,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: 'almacen.kardex.confirmar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: 'BORRADOR', despues: 'CONFIRMADO' } },
  });

  revalidatePath(`/almacen/kardex/${id}`);
  revalidatePath('/almacen/kardex');
  return { ok: true, id };
}

/** Anula con un contra-movimiento (mismo concepto, signo invertido). El original nunca se edita ni se borra. */
export async function anularMovimiento(id: string, motivo: string): Promise<AccionResultado> {
  const session = await requirePermission('almacen.kardex.anular');
  const tenant = await getCurrentTenant();
  if (!motivo.trim()) return { ok: false, error: 'Indica el motivo de la anulación.' };

  const [mov] = await db.select().from(kardexMovements).where(and(eq(kardexMovements.id, id), eq(kardexMovements.tenantId, tenant.id))).limit(1);
  if (!mov) return { ok: false, error: 'El movimiento ya no existe.' };
  if (mov.estado !== 'CONFIRMADO') return { ok: false, error: 'Solo se pueden anular movimientos confirmados.' };

  const [concepto] = await db.select().from(kardexConcepts).where(eq(kardexConcepts.id, mov.kardexConceptId)).limit(1);
  if (!concepto) return { ok: false, error: 'Concepto inválido.' };

  const lineas = await db.select().from(kardexMovementLines).where(eq(kardexMovementLines.movementId, id));
  const materialesPorId = new Map((await db.select().from(materials).where(inArray(materials.id, lineas.map((l) => l.materialId)))).map((m) => [m.id, m]));

  let contraId = '';
  try {
    await dbTx.transaction(async (tx) => {
      const consecutivo = await nextCode(tx, tenant.id, 'KX');
      const [contra] = await tx
        .insert(kardexMovements)
        .values({
          tenantId: tenant.id,
          consecutivo,
          kardexConceptId: mov.kardexConceptId,
          warehouseId: mov.warehouseId,
          partyId: mov.partyId,
          documentoSoporte: `Anulación de ${mov.consecutivo ?? mov.id}`,
          estado: 'CONFIRMADO',
          movimientoOrigenId: mov.id,
          createdBy: session.user.id,
          confirmadoAt: new Date(),
          confirmadoBy: session.user.id,
        })
        .returning({ id: kardexMovements.id });
      const nuevoId = contra?.id;
      if (!nuevoId) throw new KardexError('No se pudo crear el contra-movimiento.');
      contraId = nuevoId;

      for (const linea of lineas) {
        const material = materialesPorId.get(linea.materialId);
        if (!material) throw new KardexError('Material no encontrado para la línea.');

        const resultado = await aplicarLineaKardex(tx, tenant.id, {
          warehouseId: mov.warehouseId,
          materialId: linea.materialId,
          cantidad: Number(linea.cantidad),
          costoUnitario: Number(linea.costoUnitario),
          lote: linea.lote,
          serie: linea.serie,
          fechaVencimiento: linea.fechaVencimiento,
          signo: signoOpuesto(concepto.signo),
          afectaCostoPromedio: concepto.afectaCostoPromedio,
          manejaLote: material.manejaLote,
        });

        await tx.insert(kardexMovementLines).values({
          movementId: contraId,
          materialId: linea.materialId,
          cantidad: linea.cantidad,
          costoUnitario: resultado.costoUnitarioAplicado,
          costoTotal: resultado.costoTotal,
          lote: resultado.loteAplicado,
          serie: linea.serie,
          fechaVencimiento: linea.fechaVencimiento,
          saldoResultante: resultado.saldoResultante,
        });
      }

      await tx.update(kardexMovements).set({ estado: 'ANULADO', motivoAnulacion: motivo }).where(eq(kardexMovements.id, id));
    });
  } catch (error) {
    if (error instanceof KardexError) return { ok: false, error: error.message };
    console.error('[anularMovimiento]', error);
    return { ok: false, error: 'No se pudo anular el movimiento.' };
  }

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'almacen.kardex',
    entidadId: id,
    accion: 'UPDATE',
    nivel: 'CRITICO',
    permiso: 'almacen.kardex.anular',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: 'CONFIRMADO', despues: 'ANULADO' }, contraMovimiento: { antes: null, despues: contraId } },
  });

  revalidatePath(`/almacen/kardex/${id}`);
  revalidatePath('/almacen/kardex');
  return { ok: true, id: contraId };
}

export async function obtenerMovimiento(id: string) {
  await requirePermission('almacen.kardex.ver');
  const tenant = await getCurrentTenant();

  const [mov] = await db
    .select({
      id: kardexMovements.id,
      consecutivo: kardexMovements.consecutivo,
      fecha: kardexMovements.fecha,
      estado: kardexMovements.estado,
      motivoAnulacion: kardexMovements.motivoAnulacion,
      documentoSoporte: kardexMovements.documentoSoporte,
      movimientoOrigenId: kardexMovements.movimientoOrigenId,
      warehouseId: kardexMovements.warehouseId,
      warehouseNombre: warehouses.nombre,
      kardexConceptId: kardexMovements.kardexConceptId,
      conceptoCodigo: kardexConcepts.codigo,
      conceptoNombre: kardexConcepts.nombre,
      signo: kardexConcepts.signo,
      partyId: kardexMovements.partyId,
      partyNombre: parties.nombre,
    })
    .from(kardexMovements)
    .innerJoin(kardexConcepts, eq(kardexConcepts.id, kardexMovements.kardexConceptId))
    .innerJoin(warehouses, eq(warehouses.id, kardexMovements.warehouseId))
    .leftJoin(parties, eq(parties.id, kardexMovements.partyId))
    .where(and(eq(kardexMovements.id, id), eq(kardexMovements.tenantId, tenant.id)))
    .limit(1);
  if (!mov) return null;

  const lineas = await db
    .select({
      id: kardexMovementLines.id,
      materialId: kardexMovementLines.materialId,
      materialCodigo: materials.codigo,
      materialNombre: materials.nombre,
      cantidad: kardexMovementLines.cantidad,
      costoUnitario: kardexMovementLines.costoUnitario,
      costoTotal: kardexMovementLines.costoTotal,
      lote: kardexMovementLines.lote,
      serie: kardexMovementLines.serie,
      fechaVencimiento: kardexMovementLines.fechaVencimiento,
      saldoResultante: kardexMovementLines.saldoResultante,
    })
    .from(kardexMovementLines)
    .innerJoin(materials, eq(materials.id, kardexMovementLines.materialId))
    .where(eq(kardexMovementLines.movementId, id));

  return { ...mov, lineas };
}

export type OpcionesMovimiento = {
  warehouses: { value: string; label: string }[];
  conceptos: { id: string; codigo: string; nombre: string; signo: 'ENTRADA' | 'SALIDA'; exigeTercero: boolean; exigeOt: boolean }[];
  parties: { value: string; label: string }[];
  materiales: { id: string; codigo: string; nombre: string; manejaLote: boolean; manejaSerie: boolean; uomSimbolo: string | null }[];
};

export async function obtenerOpcionesMovimiento(): Promise<OpcionesMovimiento> {
  await requirePermission('almacen.kardex.ver');
  const tenant = await getCurrentTenant();

  const [wh, conceptos, prts, mats] = await Promise.all([
    db.select({ value: warehouses.id, label: warehouses.nombre }).from(warehouses).where(and(eq(warehouses.tenantId, tenant.id), eq(warehouses.activo, true), isNull(warehouses.deletedAt))).orderBy(warehouses.nombre),
    db
      .select({ id: kardexConcepts.id, codigo: kardexConcepts.codigo, nombre: kardexConcepts.nombre, signo: kardexConcepts.signo, exigeTercero: kardexConcepts.exigeTercero, exigeOt: kardexConcepts.exigeOt })
      .from(kardexConcepts)
      .where(and(eq(kardexConcepts.tenantId, tenant.id), eq(kardexConcepts.activo, true), isNull(kardexConcepts.deletedAt)))
      .orderBy(kardexConcepts.nombre),
    db.select({ value: parties.id, label: parties.nombre }).from(parties).where(and(eq(parties.tenantId, tenant.id), eq(parties.activo, true), isNull(parties.deletedAt))).orderBy(parties.nombre),
    db
      .select({ id: materials.id, codigo: materials.codigo, nombre: materials.nombre, manejaLote: materials.manejaLote, manejaSerie: materials.manejaSerie, uomSimbolo: uoms.simbolo })
      .from(materials)
      .leftJoin(uoms, eq(uoms.id, materials.uomId))
      .where(and(eq(materials.tenantId, tenant.id), eq(materials.activo, true), isNull(materials.deletedAt)))
      .orderBy(materials.nombre),
  ]);

  return { warehouses: wh, conceptos, parties: prts, materiales: mats };
}
