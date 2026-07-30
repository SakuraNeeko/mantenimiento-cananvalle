'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import {
  assets,
  costCenters,
  failureCauses,
  failureEffects,
  kardexConcepts,
  kardexMovementLines,
  kardexMovements,
  locations,
  maintenanceTypes,
  materials,
  notifications,
  parties,
  responsibleCenters,
  serviceRequests,
  technicalActions,
  users,
  warehouses,
  woComments,
  woLabor,
  woMaterials,
  woOtherCosts,
  woStatusHistory,
  woTasks,
  woThirdPartyCosts,
  workOrders,
  workTypes,
} from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { nextCode } from '@/lib/sequences';
import { ordenBaseSchema, type OrdenFormValues } from '@/lib/validators/orden';
import { aplicarLineaKardex, KardexError } from '../almacen/kardex/kardex-engine';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

function datosDeFormulario(data: OrdenFormValues) {
  return {
    descripcionProblema: data.descripcionProblema,
    prioridad: data.prioridad,
    criticidad: data.criticidad,
    assetId: data.assetId ?? null,
    locationId: data.locationId ?? null,
    costCenterId: data.costCenterId ?? null,
    responsibleCenterId: data.responsibleCenterId ?? null,
    maintenanceTypeId: data.maintenanceTypeId ?? null,
    workTypeId: data.workTypeId ?? null,
    causaFallaId: data.causaFallaId ?? null,
    efectoFallaId: data.efectoFallaId ?? null,
    technicalActionId: data.technicalActionId ?? null,
    requiereParo: data.requiereParo,
    permisoTrabajoRequerido: data.permisoTrabajoRequerido,
    tiempoEstimadoHoras: data.tiempoEstimadoHoras ?? null,
  };
}

async function registrarCambioEstado(tenantId: string, id: string, antes: string, despues: string, userId: string, motivo?: string) {
  await db.insert(woStatusHistory).values({ workOrderId: id, estadoAnterior: antes as never, estadoNuevo: despues as never, motivo: motivo ?? null, createdBy: userId });
  await writeAudit({ tenantId, entidad: 'ordenes', entidadId: id, accion: 'UPDATE', permiso: 'ordenes.editar', userId, diff: { estado: { antes, despues } } });
}

async function notificar(tenantId: string, userId: string, tipo: string, titulo: string, cuerpo: string, entidadId: string) {
  await db.insert(notifications).values({ tenantId, userId, tipo, titulo, cuerpo, link: `/ordenes/${entidadId}`, entidad: 'ordenes', entidadId });
}

export async function crearOrden(input: OrdenFormValues): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.crear');
  const parsed = ordenBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [fila] = await db
    .insert(workOrders)
    .values({ tenantId: tenant.id, origen: 'MANUAL', ...datosDeFormulario(parsed.data) })
    .returning({ id: workOrders.id });

  const id = fila?.id;
  if (!id) return { ok: false, error: 'No se pudo crear la orden.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'ordenes', entidadId: id, accion: 'INSERT', permiso: 'ordenes.crear', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function actualizarOrden(id: string, input: OrdenFormValues): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.editar');
  const parsed = ordenBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'BORRADOR') return { ok: false, error: 'Solo se puede editar mientras está en borrador.' };

  await db.update(workOrders).set(datosDeFormulario(parsed.data)).where(eq(workOrders.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'ordenes', entidadId: id, accion: 'UPDATE', permiso: 'ordenes.editar', userId: session.user.id, diff: buildDiff(ot as unknown as Record<string, unknown>, parsed.data) });

  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function eliminarOrden(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.eliminar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'BORRADOR') return { ok: false, error: 'Solo se pueden eliminar órdenes en borrador.' };

  await db.delete(workOrders).where(eq(workOrders.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'ordenes', entidadId: id, accion: 'DELETE', nivel: 'CRITICO', permiso: 'ordenes.eliminar', userId: session.user.id });
  revalidatePath('/ordenes');
  return { ok: true };
}

/** BORRADOR → PLANIFICADA. Aquí se asigna el consecutivo (D-08), igual que Solicitudes y Kárdex. */
export async function planificarOrden(id: string, fechaProgramada: string, warehouseId?: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.planificar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'BORRADOR') return { ok: false, error: 'Solo se puede planificar una orden en borrador.' };
  if (!fechaProgramada) return { ok: false, error: 'Indica la fecha programada.' };

  await dbTx.transaction(async (tx) => {
    const consecutivo = await nextCode(tx, tenant.id, 'OT');
    await tx.update(workOrders).set({ estado: 'PLANIFICADA', consecutivo, fechaProgramada: new Date(fechaProgramada), warehouseId: warehouseId || null }).where(eq(workOrders.id, id));
  });

  await registrarCambioEstado(tenant.id, id, 'BORRADOR', 'PLANIFICADA', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

/** PLANIFICADA → ASIGNADA directo (P-02): no existe el estado APROBADA. */
export async function asignarOrden(id: string, responsablePrincipalUserId: string, contractId?: string, partyId?: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.asignar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'PLANIFICADA') return { ok: false, error: 'Solo se puede asignar una orden planificada.' };
  if (!responsablePrincipalUserId) return { ok: false, error: 'Selecciona un responsable.' };

  await db.update(workOrders).set({ estado: 'ASIGNADA', responsablePrincipalUserId, contractId: contractId || null, partyId: partyId || null }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'PLANIFICADA', 'ASIGNADA', session.user.id);
  await notificar(tenant.id, responsablePrincipalUserId, 'ot_asignada', 'Te asignaron una orden de trabajo', ot.consecutivo ?? '', id);

  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function iniciarEjecucion(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ejecutar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'ASIGNADA') return { ok: false, error: 'Solo se puede iniciar una orden asignada.' };

  await db.update(workOrders).set({ estado: 'EN_EJECUCION', fechaInicioReal: new Date() }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'ASIGNADA', 'EN_EJECUCION', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function marcarPendiente(id: string, causaPendienteId: string, motivo: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ejecutar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'EN_EJECUCION') return { ok: false, error: 'Solo una orden en ejecución puede quedar pendiente.' };

  await db.update(workOrders).set({ estado: 'PENDIENTE', causaPendienteId: causaPendienteId || null, motivoPendiente: motivo || null }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'EN_EJECUCION', 'PENDIENTE', session.user.id, motivo);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function reanudarEjecucion(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ejecutar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'PENDIENTE') return { ok: false, error: 'Solo se puede reanudar una orden pendiente.' };

  await db.update(workOrders).set({ estado: 'EN_EJECUCION' }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'PENDIENTE', 'EN_EJECUCION', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

/** Exige que todas las tareas críticas del checklist estén completadas (§7.2 del prompt maestro). */
export async function marcarEjecutada(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ejecutar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'EN_EJECUCION') return { ok: false, error: 'Solo se puede marcar como ejecutada una orden en ejecución.' };

  const [pendientesCriticas] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(woTasks)
    .where(and(eq(woTasks.workOrderId, id), eq(woTasks.esCritica, true), isNull(woTasks.completadaAt)));
  if ((pendientesCriticas?.n ?? 0) > 0) {
    return { ok: false, error: 'Hay tareas críticas del checklist sin completar.' };
  }

  await db.update(workOrders).set({ estado: 'EJECUTADA', fechaFinReal: new Date() }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'EN_EJECUCION', 'EJECUTADA', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function firmarComoEjecutor(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.firmar.ejecutor');
  const tenant = await getCurrentTenant();
  await db.update(workOrders).set({ firmaEjecutorUserId: session.user.id, firmaEjecutorAt: new Date() }).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id)));
  revalidatePath(`/ordenes/${id}`);
  return { ok: true, id };
}

export async function firmarComoAprobador(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.firmar.aprobador');
  const tenant = await getCurrentTenant();
  await db.update(workOrders).set({ firmaAprobadorUserId: session.user.id, firmaAprobadorAt: new Date() }).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id)));
  revalidatePath(`/ordenes/${id}`);
  return { ok: true, id };
}

/**
 * Liquidar (transaccional, §7.2): consolida los 4 costos y confirma las
 * salidas de kárdex pendientes de `wo_materials` — el mismo motor de la
 * Fase 4 (`aplicarLineaKardex`), con el concepto `SAL-OT` que desde la
 * Fase 2 exige justo esto (`exige_ot`).
 */
export async function liquidarOrden(id: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.liquidar');
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'EJECUTADA') return { ok: false, error: 'Solo se puede liquidar una orden ejecutada.' };

  const [laborRows, materialRows, tercerosRows, otrosRows] = await Promise.all([
    db.select().from(woLabor).where(eq(woLabor.workOrderId, id)),
    db.select().from(woMaterials).where(eq(woMaterials.workOrderId, id)),
    db.select().from(woThirdPartyCosts).where(eq(woThirdPartyCosts.workOrderId, id)),
    db.select().from(woOtherCosts).where(eq(woOtherCosts.workOrderId, id)),
  ]);

  const pendientesDeKardex = materialRows.filter((m) => !m.kardexMovementId);
  if (pendientesDeKardex.length > 0 && !ot.warehouseId) {
    return { ok: false, error: 'La orden tiene materiales pero no tiene almacén asignado. Ajusta la planificación.' };
  }

  const materialesPorId = new Map((await db.select().from(materials).where(inArray(materials.id, pendientesDeKardex.map((m) => m.materialId)))).map((m) => [m.id, m]));
  const [conceptoSalOt] = await db.select().from(kardexConcepts).where(and(eq(kardexConcepts.tenantId, tenant.id), eq(kardexConcepts.codigo, 'SAL-OT'))).limit(1);
  if (pendientesDeKardex.length > 0 && !conceptoSalOt) {
    return { ok: false, error: 'Falta el concepto de kárdex "SAL-OT" en Infraestructura → Conceptos de kárdex.' };
  }

  const costoManoObra = laborRows.reduce((sum, l) => sum + Number(l.costoCalculado), 0);
  const costoTerceros = tercerosRows.reduce((sum, t) => sum + Number(t.monto), 0);
  const costoOtros = otrosRows.reduce((sum, o) => sum + Number(o.monto), 0);

  try {
    let costoMateriales = materialRows.reduce((sum, m) => sum + Number(m.costoTotal ?? 0), 0);

    await dbTx.transaction(async (tx) => {
      if (pendientesDeKardex.length > 0 && ot.warehouseId && conceptoSalOt) {
        const consecutivo = await nextCode(tx, tenant.id, 'KX');
        const [mov] = await tx
          .insert(kardexMovements)
          .values({ tenantId: tenant.id, consecutivo, kardexConceptId: conceptoSalOt.id, warehouseId: ot.warehouseId, documentoSoporte: ot.consecutivo, estado: 'CONFIRMADO', createdBy: session.user.id, confirmadoAt: new Date(), confirmadoBy: session.user.id })
          .returning({ id: kardexMovements.id });
        const movId = mov?.id;
        if (!movId) throw new KardexError('No se pudo crear el movimiento de kárdex de la OT.');

        for (const linea of pendientesDeKardex) {
          const material = materialesPorId.get(linea.materialId);
          if (!material) throw new KardexError('Material no encontrado.');
          const cantidad = Number(linea.cantidadEntregada ?? linea.cantidadSolicitada);

          const resultado = await aplicarLineaKardex(tx, tenant.id, {
            warehouseId: ot.warehouseId,
            materialId: linea.materialId,
            cantidad,
            costoUnitario: 0,
            lote: null,
            serie: null,
            fechaVencimiento: null,
            signo: 'SALIDA',
            afectaCostoPromedio: conceptoSalOt.afectaCostoPromedio,
            manejaLote: material.manejaLote,
          });

          await tx.insert(kardexMovementLines).values({ movementId: movId, materialId: linea.materialId, cantidad: String(cantidad), costoUnitario: resultado.costoUnitarioAplicado, costoTotal: resultado.costoTotal, saldoResultante: resultado.saldoResultante });
          await tx.update(woMaterials).set({ kardexMovementId: movId, cantidadEntregada: String(cantidad), costoUnitario: resultado.costoUnitarioAplicado, costoTotal: resultado.costoTotal }).where(eq(woMaterials.id, linea.id));

          costoMateriales += Number(resultado.costoTotal);
        }
      }

      const costoTotal = costoManoObra + costoMateriales + costoTerceros + costoOtros;
      await tx
        .update(workOrders)
        .set({ estado: 'LIQUIDADA', costoManoObra: String(costoManoObra), costoMateriales: String(costoMateriales), costoTerceros: String(costoTerceros), costoOtros: String(costoOtros), costoTotal: String(costoTotal), liquidadaAt: new Date(), liquidadaBy: session.user.id })
        .where(eq(workOrders.id, id));
    });
  } catch (error) {
    if (error instanceof KardexError) return { ok: false, error: error.message };
    console.error('[liquidarOrden]', error);
    return { ok: false, error: 'No se pudo liquidar la orden.' };
  }

  await registrarCambioEstado(tenant.id, id, 'EJECUTADA', 'LIQUIDADA', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  revalidatePath('/almacen/kardex');
  return { ok: true, id };
}

export async function cerrarOrden(id: string, causaCierreId: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.cerrar');
  if (!causaCierreId) return { ok: false, error: 'Indica la causa de cierre.' };
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'LIQUIDADA') return { ok: false, error: 'Solo se puede cerrar una orden liquidada.' };
  if (!ot.firmaEjecutorAt) return { ok: false, error: 'La orden necesita la firma del ejecutor antes de cerrarse.' };

  await db.update(workOrders).set({ estado: 'CERRADA', causaCierreId, cerradaAt: new Date(), cerradaBy: session.user.id }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'LIQUIDADA', 'CERRADA', session.user.id);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function reabrirOrden(id: string, motivo: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.reabrir');
  if (!motivo.trim()) return { ok: false, error: 'Indica el motivo de la reapertura.' };
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (ot.estado !== 'CERRADA') return { ok: false, error: 'Solo se puede reabrir una orden cerrada.' };

  await db.update(workOrders).set({ estado: 'LIQUIDADA', cerradaAt: null, cerradaBy: null }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, 'CERRADA', 'LIQUIDADA', session.user.id, motivo);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

export async function cancelarOrden(id: string, motivo: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.cancelar');
  if (!motivo.trim()) return { ok: false, error: 'Indica el motivo de la cancelación.' };
  const tenant = await getCurrentTenant();
  const [ot] = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id))).limit(1);
  if (!ot) return { ok: false, error: 'La orden ya no existe.' };
  if (!['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'].includes(ot.estado)) {
    return { ok: false, error: 'Esta orden ya no se puede cancelar.' };
  }

  await db.update(workOrders).set({ estado: 'CANCELADA', motivoCancelacion: motivo }).where(eq(workOrders.id, id));
  await registrarCambioEstado(tenant.id, id, ot.estado, 'CANCELADA', session.user.id, motivo);
  revalidatePath(`/ordenes/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id };
}

/** Cierra la deuda técnica de la Fase 5: arrastra activo, descripción, prioridad y solicitante; mantiene el vínculo bidireccional. */
export async function convertirSolicitudEnOrden(serviceRequestId: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.crear');
  await requirePermission('solicitudes.convertir_ot');
  const tenant = await getCurrentTenant();

  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, serviceRequestId), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (sr.estado !== 'APROBADA') return { ok: false, error: 'Solo se puede convertir una solicitud aprobada.' };

  let nuevaId = '';
  await dbTx.transaction(async (tx) => {
    const [ot] = await tx
      .insert(workOrders)
      .values({
        tenantId: tenant.id,
        origen: 'SS',
        serviceRequestId: sr.id,
        assetId: sr.assetId,
        locationId: sr.locationId,
        workTypeId: sr.workTypeId,
        prioridad: sr.prioridad,
        descripcionProblema: sr.descripcion,
        requiereParo: false,
        permisoTrabajoRequerido: false,
      })
      .returning({ id: workOrders.id });
    nuevaId = ot?.id ?? '';
    if (!nuevaId) throw new Error('No se pudo crear la orden.');

    await tx.update(serviceRequests).set({ estado: 'CONVERTIDA_EN_OT' }).where(eq(serviceRequests.id, sr.id));
  });

  await writeAudit({ tenantId: tenant.id, entidad: 'ordenes', entidadId: nuevaId, accion: 'INSERT', permiso: 'ordenes.crear', userId: session.user.id, diff: { origen: { antes: null, despues: `SS ${sr.consecutivo}` } } });
  await notificar(tenant.id, sr.solicitanteUserId, 'solicitud_convertida', 'Tu solicitud se convirtió en una orden de trabajo', sr.consecutivo ?? '', nuevaId);

  revalidatePath('/ordenes');
  revalidatePath('/solicitudes');
  revalidatePath(`/solicitudes/${sr.id}`);
  return { ok: true, id: nuevaId };
}

/* -------------------------------------------------------------------------- */
/* BITÁCORA                                                                   */
/* -------------------------------------------------------------------------- */

export async function agregarComentarioOrden(id: string, mensaje: string): Promise<AccionResultado> {
  const session = await requirePermission('ordenes.ver');
  if (!mensaje.trim()) return { ok: false, error: 'Escribe un mensaje.' };
  await db.insert(woComments).values({ workOrderId: id, mensaje, createdBy: session.user.id });
  revalidatePath(`/ordenes/${id}`);
  return { ok: true };
}

export async function obtenerComentariosOrden(id: string) {
  await requirePermission('ordenes.ver');
  return db
    .select({ id: woComments.id, mensaje: woComments.mensaje, createdAt: woComments.createdAt, autorNombre: users.nombre })
    .from(woComments)
    .leftJoin(users, eq(users.id, woComments.createdBy))
    .where(eq(woComments.workOrderId, id))
    .orderBy(woComments.createdAt);
}

export async function obtenerHistorialOrden(id: string) {
  await requirePermission('ordenes.ver');
  return db
    .select({ id: woStatusHistory.id, estadoAnterior: woStatusHistory.estadoAnterior, estadoNuevo: woStatusHistory.estadoNuevo, motivo: woStatusHistory.motivo, fecha: woStatusHistory.fecha, autorNombre: users.nombre })
    .from(woStatusHistory)
    .leftJoin(users, eq(users.id, woStatusHistory.createdBy))
    .where(eq(woStatusHistory.workOrderId, id))
    .orderBy(woStatusHistory.fecha);
}

/* -------------------------------------------------------------------------- */
/* OPCIONES PARA FORMULARIOS                                                  */
/* -------------------------------------------------------------------------- */

export type OpcionesOrden = {
  assets: { value: string; label: string }[];
  locations: { value: string; label: string }[];
  costCenters: { value: string; label: string }[];
  responsibleCenters: { value: string; label: string }[];
  maintenanceTypes: { value: string; label: string }[];
  workTypes: { value: string; label: string }[];
  failureCauses: { value: string; label: string }[];
  failureEffects: { value: string; label: string }[];
  technicalActions: { value: string; label: string }[];
  warehouses: { value: string; label: string }[];
  responsables: { value: string; label: string }[];
  parties: { value: string; label: string }[];
};

export async function obtenerOpcionesOrden(): Promise<OpcionesOrden> {
  await requirePermission('ordenes.crear');
  const tenant = await getCurrentTenant();
  const activo = <T extends { tenantId: unknown; activo: unknown; deletedAt: unknown }>(t: T) => and(eq(t.tenantId as never, tenant.id), eq(t.activo as never, true), isNull(t.deletedAt as never));

  const [ast, locs, ccs, rcs, mts, wts, fcs, fes, tas, whs, prts] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    db.select({ value: locations.id, label: locations.nombre }).from(locations).where(activo(locations)).orderBy(locations.nombre),
    db.select({ value: costCenters.id, label: costCenters.nombre }).from(costCenters).where(activo(costCenters)).orderBy(costCenters.nombre),
    db.select({ value: responsibleCenters.id, label: responsibleCenters.nombre }).from(responsibleCenters).where(activo(responsibleCenters)).orderBy(responsibleCenters.nombre),
    db.select({ value: maintenanceTypes.id, label: maintenanceTypes.nombre }).from(maintenanceTypes).where(activo(maintenanceTypes)).orderBy(maintenanceTypes.nombre),
    db.select({ value: workTypes.id, label: workTypes.nombre }).from(workTypes).where(activo(workTypes)).orderBy(workTypes.nombre),
    db.select({ value: failureCauses.id, label: failureCauses.nombre }).from(failureCauses).where(activo(failureCauses)).orderBy(failureCauses.nombre),
    db.select({ value: failureEffects.id, label: failureEffects.nombre }).from(failureEffects).where(activo(failureEffects)).orderBy(failureEffects.nombre),
    db.select({ value: technicalActions.id, label: technicalActions.nombre }).from(technicalActions).where(activo(technicalActions)).orderBy(technicalActions.nombre),
    db.select({ value: warehouses.id, label: warehouses.nombre }).from(warehouses).where(activo(warehouses)).orderBy(warehouses.nombre),
    db.select({ value: parties.id, label: parties.nombre }).from(parties).where(activo(parties)).orderBy(parties.nombre),
  ]);

  const responsablesFila = await db.select({ value: users.id, label: users.nombre }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.activo, true), isNull(users.deletedAt))).orderBy(users.nombre);

  return { assets: ast, locations: locs, costCenters: ccs, responsibleCenters: rcs, maintenanceTypes: mts, workTypes: wts, failureCauses: fcs, failureEffects: fes, technicalActions: tas, warehouses: whs, responsables: responsablesFila, parties: prts };
}

export async function obtenerCausasCierre() {
  await requirePermission('ordenes.cerrar');
  const tenant = await getCurrentTenant();
  const { woClosingCauses } = await import('@/db/schema');
  return db.select({ value: woClosingCauses.id, label: woClosingCauses.nombre }).from(woClosingCauses).where(and(eq(woClosingCauses.tenantId, tenant.id), eq(woClosingCauses.activo, true), isNull(woClosingCauses.deletedAt))).orderBy(woClosingCauses.nombre);
}

export async function obtenerCausasPendiente() {
  await requirePermission('ordenes.ejecutar');
  const tenant = await getCurrentTenant();
  const { woPendingCauses } = await import('@/db/schema');
  return db.select({ value: woPendingCauses.id, label: woPendingCauses.nombre }).from(woPendingCauses).where(and(eq(woPendingCauses.tenantId, tenant.id), eq(woPendingCauses.activo, true), isNull(woPendingCauses.deletedAt))).orderBy(woPendingCauses.nombre);
}
