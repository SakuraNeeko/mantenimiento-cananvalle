import { and, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, downtimes, kardexConcepts, kardexMovements, kardexMovementLines, maintenanceTypes, responsibles, serviceRequests, warehouseStock, workOrders } from '@/db/schema';

/**
 * Motor de KPIs (§5 del prompt maestro). Funciones puras de solo lectura:
 * cada una recibe `tenantId` + un rango `[desde, hasta]` y devuelve el
 * número ya calculado, con la fórmula explícita en el comentario — tal como
 * pide el prompt maestro ("con fórmulas explícitas en el código").
 *
 * Todas leen directo de `work_orders`/`downtimes`/`service_requests`: una OT
 * enviada a historia sigue viva ahí (`estado = 'EN_HISTORIA'`), enviarla a
 * historia solo agrega una copia inmutable en `wo_history`, no la saca de
 * la tabla operativa — así los reportes no necesitan mirar dos tablas.
 */

export type RangoFechas = { desde: Date; hasta: Date };

const ESTADOS_CERRADOS_OT = ['CERRADA', 'EN_HISTORIA'] as const;

/** MTBF = tiempo total de operación ÷ número de fallas (paros no programados) en el periodo. */
export async function calcularMTBF(tenantId: string, rango: RangoFechas, assetId?: string): Promise<{ mtbfHoras: number | null; fallas: number }> {
  const condiciones = [eq(downtimes.tenantId, tenantId), eq(downtimes.tipo, 'NO_PROGRAMADO'), gte(downtimes.fechaInicio, rango.desde), lte(downtimes.fechaInicio, rango.hasta)];
  if (assetId) condiciones.push(eq(downtimes.assetId, assetId));

  const [fila] = await db
    .select({ n: sql<number>`count(*)::int`, minutosParo: sql<number>`coalesce(sum(${downtimes.duracionMinutos}), 0)::float` })
    .from(downtimes)
    .where(and(...condiciones));
  const fallas = fila?.n ?? 0;
  const minutosParo = fila?.minutosParo ?? 0;

  if (fallas === 0) return { mtbfHoras: null, fallas: 0 };

  const horasTotalesPeriodo = (rango.hasta.getTime() - rango.desde.getTime()) / 3_600_000;
  const horasOperacion = Math.max(0, horasTotalesPeriodo - minutosParo / 60);
  return { mtbfHoras: horasOperacion / fallas, fallas };
}

/** MTTR = tiempo total de reparación ÷ número de reparaciones (paros cerrados) en el periodo. */
export async function calcularMTTR(tenantId: string, rango: RangoFechas, assetId?: string): Promise<{ mttrHoras: number | null; reparaciones: number }> {
  const condiciones = [eq(downtimes.tenantId, tenantId), eq(downtimes.estado, 'CERRADO'), gte(downtimes.fechaFin, rango.desde), lte(downtimes.fechaFin, rango.hasta)];
  if (assetId) condiciones.push(eq(downtimes.assetId, assetId));

  const [fila] = await db
    .select({ n: sql<number>`count(*)::int`, minutosParo: sql<number>`coalesce(sum(${downtimes.duracionMinutos}), 0)::float` })
    .from(downtimes)
    .where(and(...condiciones));
  const reparaciones = fila?.n ?? 0;
  const minutosParo = fila?.minutosParo ?? 0;

  if (reparaciones === 0) return { mttrHoras: null, reparaciones: 0 };
  return { mttrHoras: minutosParo / 60 / reparaciones, reparaciones };
}

/** Disponibilidad = MTBF ÷ (MTBF + MTTR) × 100. */
export function calcularDisponibilidad(mtbfHoras: number | null, mttrHoras: number | null): number | null {
  if (mtbfHoras === null || mttrHoras === null || mtbfHoras + mttrHoras === 0) return null;
  return (mtbfHoras / (mtbfHoras + mttrHoras)) * 100;
}

/** Cumplimiento del plan = OT de origen PLAN ejecutadas a tiempo ÷ OT de origen PLAN programadas en el periodo × 100. */
export async function calcularCumplimientoPlan(tenantId: string, rango: RangoFechas): Promise<{ cumplimiento: number | null; programadas: number; aTiempo: number }> {
  const programadas = await db
    .select({ id: workOrders.id, fechaProgramada: workOrders.fechaProgramada, fechaFinReal: workOrders.fechaFinReal })
    .from(workOrders)
    .where(and(eq(workOrders.tenantId, tenantId), eq(workOrders.origen, 'PLAN'), gte(workOrders.fechaProgramada, rango.desde), lte(workOrders.fechaProgramada, rango.hasta)));

  if (programadas.length === 0) return { cumplimiento: null, programadas: 0, aTiempo: 0 };
  const aTiempo = programadas.filter((o) => o.fechaFinReal && o.fechaProgramada && o.fechaFinReal.getTime() <= o.fechaProgramada.getTime()).length;
  return { cumplimiento: (aTiempo / programadas.length) * 100, programadas: programadas.length, aTiempo };
}

/** Índice preventivo/correctivo = costo de OT con tipo de mantenimiento "preventivo" ÷ costo total de OT cerradas × 100. */
export async function calcularIndicePreventivoCorrectivo(tenantId: string, rango: RangoFechas): Promise<{ indice: number | null; costoPreventivo: number; costoTotal: number }> {
  const filas = await db
    .select({ costoTotal: workOrders.costoTotal, esPreventivo: maintenanceTypes.codigo })
    .from(workOrders)
    .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, workOrders.maintenanceTypeId))
    .where(and(eq(workOrders.tenantId, tenantId), inArray(workOrders.estado, [...ESTADOS_CERRADOS_OT]), gte(workOrders.fechaFinReal, rango.desde), lte(workOrders.fechaFinReal, rango.hasta)));

  const costoTotal = filas.reduce((sum, f) => sum + Number(f.costoTotal), 0);
  const costoPreventivo = filas.filter((f) => f.esPreventivo && ['PREV', 'PRED', 'LUB', 'INSP', 'METR'].includes(f.esPreventivo)).reduce((sum, f) => sum + Number(f.costoTotal), 0);

  if (costoTotal === 0) return { indice: null, costoPreventivo: 0, costoTotal: 0 };
  return { indice: (costoPreventivo / costoTotal) * 100, costoPreventivo, costoTotal };
}

/**
 * Backlog = horas de trabajo pendiente ÷ horas-hombre disponibles por semana.
 * Simplificación documentada: las horas disponibles asumen 40 h/semana por
 * cada responsable activo — el modelo no define una jornada configurable.
 */
export async function calcularBacklog(tenantId: string): Promise<{ backlogSemanas: number | null; horasPendientes: number; horasDisponiblesSemana: number }> {
  const [filaPendientes] = await db
    .select({ horasPendientes: sql<number>`coalesce(sum(${workOrders.tiempoEstimadoHoras}), 0)::float` })
    .from(workOrders)
    .where(and(eq(workOrders.tenantId, tenantId), inArray(workOrders.estado, ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE'])));
  const horasPendientes = filaPendientes?.horasPendientes ?? 0;

  const [filaResponsables] = await db.select({ n: sql<number>`count(*)::int` }).from(responsibles).where(and(eq(responsibles.tenantId, tenantId), eq(responsibles.activo, true), eq(responsibles.disponible, true)));

  const horasDisponiblesSemana = (filaResponsables?.n ?? 0) * 40;
  if (horasDisponiblesSemana === 0) return { backlogSemanas: null, horasPendientes, horasDisponiblesSemana: 0 };
  return { backlogSemanas: horasPendientes / horasDisponiblesSemana, horasPendientes, horasDisponiblesSemana };
}

/** Costo de mantenimiento por activo = suma de costos de OT cerradas en el periodo, agrupado por activo. */
export async function calcularCostoPorActivo(tenantId: string, rango: RangoFechas, limite = 10) {
  return db
    .select({ assetId: workOrders.assetId, assetCodigo: assets.codigo, assetNombre: assets.nombre, costoTotal: sql<number>`sum(${workOrders.costoTotal})::float` })
    .from(workOrders)
    .innerJoin(assets, eq(assets.id, workOrders.assetId))
    .where(and(eq(workOrders.tenantId, tenantId), inArray(workOrders.estado, [...ESTADOS_CERRADOS_OT]), gte(workOrders.fechaFinReal, rango.desde), lte(workOrders.fechaFinReal, rango.hasta), isNotNull(workOrders.assetId)))
    .groupBy(workOrders.assetId, assets.codigo, assets.nombre)
    .orderBy(sql`sum(${workOrders.costoTotal}) desc`)
    .limit(limite);
}

/**
 * Rotación de inventario = costo de salidas en el periodo ÷ valor promedio del inventario.
 * Simplificación documentada: como no se guardan snapshots históricos de
 * valorización, "valor promedio" usa la valorización ACTUAL de `warehouse_stock`
 * como proxy — es exacto si el inventario no cambió mucho de tamaño en el periodo.
 */
export async function calcularRotacionInventario(tenantId: string, rango: RangoFechas): Promise<{ rotacion: number | null; costoSalidas: number; valorInventario: number }> {
  const [filaSalidas] = await db
    .select({ costoSalidas: sql<number>`coalesce(sum(${kardexMovementLines.costoTotal}), 0)::float` })
    .from(kardexMovementLines)
    .innerJoin(kardexMovements, eq(kardexMovements.id, kardexMovementLines.movementId))
    .innerJoin(kardexConcepts, eq(kardexConcepts.id, kardexMovements.kardexConceptId))
    .where(and(eq(kardexMovements.tenantId, tenantId), eq(kardexConcepts.signo, 'SALIDA'), eq(kardexMovements.estado, 'CONFIRMADO'), gte(kardexMovements.fecha, rango.desde), lte(kardexMovements.fecha, rango.hasta)));
  const costoSalidas = filaSalidas?.costoSalidas ?? 0;

  const [filaValor] = await db
    .select({ valorInventario: sql<number>`coalesce(sum(${warehouseStock.cantidad} * ${warehouseStock.costoPromedio}), 0)::float` })
    .from(warehouseStock)
    .where(eq(warehouseStock.tenantId, tenantId));
  const valorInventario = filaValor?.valorInventario ?? 0;

  if (valorInventario === 0) return { rotacion: null, costoSalidas, valorInventario: 0 };
  return { rotacion: costoSalidas / valorInventario, costoSalidas, valorInventario };
}

/** Cumplimiento de SLA = solicitudes atendidas dentro del plazo comprometido ÷ total con SLA definido × 100. */
export async function calcularCumplimientoSLA(tenantId: string, rango: RangoFechas): Promise<{ cumplimiento: number | null; total: number; aTiempo: number }> {
  const filas = await db
    .select({ fechaCompromiso: serviceRequests.fechaCompromiso, fechaAtencion: serviceRequests.fechaAtencion })
    .from(serviceRequests)
    .where(and(eq(serviceRequests.tenantId, tenantId), isNotNull(serviceRequests.fechaCompromiso), gte(serviceRequests.fecha, rango.desde), lte(serviceRequests.fecha, rango.hasta)));

  if (filas.length === 0) return { cumplimiento: null, total: 0, aTiempo: 0 };
  const aTiempo = filas.filter((f) => f.fechaAtencion && f.fechaCompromiso && f.fechaAtencion.getTime() <= f.fechaCompromiso.getTime()).length;
  return { cumplimiento: (aTiempo / filas.length) * 100, total: filas.length, aTiempo };
}

export type FilaPareto = { etiqueta: string; valor: number; porcentaje: number; porcentajeAcumulado: number };

function aPareto(filas: { etiqueta: string; valor: number }[]): FilaPareto[] {
  const total = filas.reduce((sum, f) => sum + f.valor, 0);
  if (total === 0) return [];
  const ordenadas = [...filas].sort((a, b) => b.valor - a.valor);
  let acumulado = 0;
  return ordenadas.map((f) => {
    const porcentaje = (f.valor / total) * 100;
    acumulado += porcentaje;
    return { etiqueta: f.etiqueta, valor: f.valor, porcentaje, porcentajeAcumulado: acumulado };
  });
}

/** Pareto de paros por causa de falla — cuál causa concentra más tiempo de paro. */
export async function paretoPorCausaFalla(tenantId: string, rango: RangoFechas): Promise<FilaPareto[]> {
  const { failureCauses } = await import('@/db/schema');
  const filas = await db
    .select({ etiqueta: sql<string>`coalesce(${failureCauses.nombre}, 'Sin causa registrada')`, valor: sql<number>`coalesce(sum(${downtimes.duracionMinutos}), 0)::float` })
    .from(downtimes)
    .leftJoin(failureCauses, eq(failureCauses.id, downtimes.causaFallaId))
    .where(and(eq(downtimes.tenantId, tenantId), eq(downtimes.estado, 'CERRADO'), gte(downtimes.fechaInicio, rango.desde), lte(downtimes.fechaInicio, rango.hasta)))
    .groupBy(sql`coalesce(${failureCauses.nombre}, 'Sin causa registrada')`);

  return aPareto(filas);
}

/** Pareto de costo de mantenimiento por activo — cuáles activos concentran más gasto. */
export async function paretoPorCosto(tenantId: string, rango: RangoFechas): Promise<FilaPareto[]> {
  const filas = await calcularCostoPorActivo(tenantId, rango, 1000);
  return aPareto(filas.map((f) => ({ etiqueta: f.assetCodigo && f.assetNombre ? `${f.assetCodigo} — ${f.assetNombre}` : (f.assetNombre ?? 'Sin activo'), valor: f.costoTotal })));
}
