import { addDays } from 'date-fns';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import {
  assetMeters,
  assets,
  maintenancePlans,
  planGenerationLog,
  planResources,
  planTasks,
  planTriggers,
  workOrders,
} from '@/db/schema';
import { nextCode } from '@/lib/sequences';

/**
 * Motor de generación automática de OT desde planes (§7.1 del prompt maestro).
 *
 * Solo evalúa disparadores CALENDARIO y CONTADOR: CONDICION (requiere un feed
 * de lecturas de condición/IoT que no existe todavía) y EVENTO (requiere el
 * módulo de Paros, Fase 8) quedan fuera del bucle — ver deuda técnica en
 * ENTREGA-FASE-7.md.
 *
 * Reprogramación FIJO/FLOTANTE y la base de cada proyección se leen de la
 * última fila de `plan_generation_log` con `resultado = 'GENERADA'` para el
 * mismo (plan, disparador, activo) — así el motor no necesita recorrer todo
 * el historial de la OT generada, solo su último resultado.
 *
 * Simplificación documentada: si el cron lleva mucho tiempo sin correr y ya
 * pasaron varios períodos de calendario, esta función solo proyecta la
 * PRÓXIMA ocurrencia (no reconstruye cada ocurrencia perdida).
 */

const ESTADOS_ABIERTOS = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA', 'LIQUIDADA'] as const;

export type ResultadoEvaluacion = 'GENERADA' | 'OMITIDA_DUPLICADO' | 'OMITIDA_SIN_PROYECCION';

export type Candidato = {
  key: string;
  planId: string;
  planCodigo: string;
  planNombre: string;
  triggerId: string;
  tipo: 'CALENDARIO' | 'CONTADOR';
  assetId: string;
  assetCodigo: string;
  assetNombre: string;
  resultado: ResultadoEvaluacion;
  fechaProbable: Date | null;
  lecturaMedidor: string | null;
  motivo: string;
};

function intervaloADias(valor: number, unidad: 'DIAS' | 'SEMANAS' | 'MESES' | 'ANIOS'): number {
  switch (unidad) {
    case 'DIAS':
      return valor;
    case 'SEMANAS':
      return valor * 7;
    case 'MESES':
      return valor * 30; // aproximación documentada: sin calendario de meses variables
    case 'ANIOS':
      return valor * 365;
  }
}

async function activosDelPlan(plan: typeof maintenancePlans.$inferSelect) {
  if (plan.alcance === 'ACTIVO_UNICO') {
    if (!plan.assetId) return [];
    const fila = await db.select().from(assets).where(and(eq(assets.id, plan.assetId), eq(assets.activo, true), isNull(assets.deletedAt))).limit(1);
    return fila;
  }

  const condiciones = [eq(assets.tenantId, plan.tenantId), eq(assets.activo, true), isNull(assets.deletedAt)];
  if (plan.claseFiltro) condiciones.push(eq(assets.clase, plan.claseFiltro));
  if (plan.criticidadFiltro) condiciones.push(eq(assets.criticidad, plan.criticidadFiltro));
  if (plan.locationFiltro) condiciones.push(eq(assets.locationId, plan.locationFiltro));
  return db.select().from(assets).where(and(...condiciones));
}

/** Última generación EXITOSA de este (plan, disparador, activo) — sirve de base para la próxima proyección. */
async function obtenerUltimaGeneracion(planId: string, triggerId: string, assetId: string) {
  const [fila] = await db
    .select({ log: planGenerationLog, workOrder: workOrders })
    .from(planGenerationLog)
    .leftJoin(workOrders, eq(workOrders.id, planGenerationLog.workOrderId))
    .where(and(eq(planGenerationLog.planId, planId), eq(planGenerationLog.triggerId, triggerId), eq(planGenerationLog.assetId, assetId), eq(planGenerationLog.resultado, 'GENERADA')))
    .orderBy(desc(planGenerationLog.fechaEvaluacion))
    .limit(1);
  return fila ?? null;
}

/** ¿Ya existe una OT sin cerrar/cancelar generada por este plan para este activo? (§7.1: "evita duplicados"). */
async function tieneOrdenAbierta(planId: string, assetId: string): Promise<boolean> {
  const [fila] = await db
    .select({ id: workOrders.id })
    .from(planGenerationLog)
    .innerJoin(workOrders, eq(workOrders.id, planGenerationLog.workOrderId))
    .where(and(eq(planGenerationLog.planId, planId), eq(planGenerationLog.assetId, assetId), eq(planGenerationLog.resultado, 'GENERADA'), inArray(workOrders.estado, [...ESTADOS_ABIERTOS])))
    .limit(1);
  return Boolean(fila);
}

/**
 * Evalúa todos los planes activos del tenant y devuelve los candidatos que
 * caen dentro de su ventana de anticipación (o ya vencidos). No escribe nada
 * en la base — `confirmarCandidatos` es quien genera de verdad.
 */
export async function evaluarGeneracion(tenantId: string): Promise<Candidato[]> {
  const planes = await db.select().from(maintenancePlans).where(and(eq(maintenancePlans.tenantId, tenantId), eq(maintenancePlans.activo, true), isNull(maintenancePlans.deletedAt)));

  const candidatos: Candidato[] = [];
  const hoy = new Date();

  for (const plan of planes) {
    const triggers = await db
      .select()
      .from(planTriggers)
      .where(and(eq(planTriggers.planId, plan.id), eq(planTriggers.activo, true), isNull(planTriggers.deletedAt), inArray(planTriggers.tipo, ['CALENDARIO', 'CONTADOR'])));
    if (triggers.length === 0) continue;

    const activosDestino = await activosDelPlan(plan);
    if (activosDestino.length === 0) continue;

    for (const trigger of triggers) {
      for (const asset of activosDestino) {
        const ultima = await obtenerUltimaGeneracion(plan.id, trigger.id, asset.id);

        let fechaProbable: Date | null = null;
        let lecturaMedidor: string | null = null;
        let motivo = '';
        let resultado: ResultadoEvaluacion = 'GENERADA';

        if (trigger.tipo === 'CALENDARIO') {
          if (!trigger.intervaloValor || !trigger.intervaloUnidad || !trigger.fechaBase) continue;
          const dias = intervaloADias(trigger.intervaloValor, trigger.intervaloUnidad);

          let base: Date;
          if (ultima) {
            const fechaEjecucionReal = ultima.workOrder?.fechaFinReal ?? null;
            base = trigger.modoReprogramacion === 'FLOTANTE' && fechaEjecucionReal ? fechaEjecucionReal : (ultima.workOrder?.fechaProgramada ?? ultima.log.fechaProyectada ?? new Date(trigger.fechaBase));
          } else {
            base = new Date(trigger.fechaBase);
          }
          fechaProbable = addDays(base, dias);
          motivo = `Cada ${trigger.intervaloValor} ${trigger.intervaloUnidad.toLowerCase()}, calculado desde ${ultima ? 'la última generación' : 'la fecha base'}.`;
        } else {
          if (!trigger.meterId || !trigger.intervaloContador) continue;
          const [medidor] = await db.select().from(assetMeters).where(and(eq(assetMeters.assetId, asset.id), eq(assetMeters.meterId, trigger.meterId), isNull(assetMeters.deletedAt))).limit(1);
          if (!medidor) {
            resultado = 'OMITIDA_SIN_PROYECCION';
            motivo = 'El activo no tiene registrado este medidor.';
          } else {
            const base = ultima?.log.lecturaMedidor ? Number(ultima.log.lecturaMedidor) : Number(medidor.valorActual);
            const objetivo = base + Number(trigger.intervaloContador);
            lecturaMedidor = String(objetivo);
            if (!medidor.promedioUsoDiario || Number(medidor.promedioUsoDiario) <= 0) {
              resultado = 'OMITIDA_SIN_PROYECCION';
              motivo = 'El medidor no tiene un promedio de uso diario registrado; no se puede proyectar una fecha.';
            } else {
              const restante = objetivo - Number(medidor.valorActual);
              const diasRestantes = Math.max(0, restante / Number(medidor.promedioUsoDiario));
              fechaProbable = addDays(hoy, diasRestantes);
              motivo = `Proyectado con el promedio de uso diario del medidor (faltan ${restante.toFixed(1)} unidades, ~${diasRestantes.toFixed(1)} días).`;
            }
          }
        }

        if (resultado === 'GENERADA' && fechaProbable) {
          const dentroDeVentana = fechaProbable.getTime() <= hoy.getTime() + trigger.diasAnticipacion * 86_400_000;
          if (!dentroDeVentana) continue;

          if (await tieneOrdenAbierta(plan.id, asset.id)) {
            resultado = 'OMITIDA_DUPLICADO';
            motivo = 'Ya existe una orden de trabajo abierta generada por este plan para este activo.';
          }
        } else if (resultado === 'GENERADA') {
          continue;
        }

        candidatos.push({
          key: `${plan.id}:${trigger.id}:${asset.id}`,
          planId: plan.id,
          planCodigo: plan.codigo,
          planNombre: plan.nombre,
          triggerId: trigger.id,
          tipo: trigger.tipo as 'CALENDARIO' | 'CONTADOR',
          assetId: asset.id,
          assetCodigo: asset.codigo,
          assetNombre: asset.nombre,
          resultado,
          fechaProbable,
          lecturaMedidor,
          motivo,
        });
      }
    }
  }

  return candidatos;
}

export type ResultadoGeneracion = { generadas: number; omitidas: number; errores: { key: string; error: string }[] };

/**
 * Genera de verdad las OT para los candidatos indicados (normalmente los que
 * `evaluarGeneracion` marcó como `GENERADA`). Cada candidato se procesa en
 * su propia transacción — si uno falla, no arrastra a los demás.
 */
export async function confirmarCandidatos(tenantId: string, candidatos: Candidato[]): Promise<ResultadoGeneracion> {
  let generadas = 0;
  let omitidas = 0;
  const errores: { key: string; error: string }[] = [];

  for (const candidato of candidatos) {
    if (candidato.resultado !== 'GENERADA' || !candidato.fechaProbable) {
      omitidas++;
      await db.insert(planGenerationLog).values({
        planId: candidato.planId,
        triggerId: candidato.triggerId,
        assetId: candidato.assetId,
        resultado: candidato.resultado,
        fechaProyectada: candidato.fechaProbable,
        lecturaMedidor: candidato.lecturaMedidor,
        detalle: candidato.motivo,
      });
      continue;
    }

    try {
      const [asset] = await db.select().from(assets).where(eq(assets.id, candidato.assetId)).limit(1);
      const [plan] = await db.select().from(maintenancePlans).where(eq(maintenancePlans.id, candidato.planId)).limit(1);
      if (!asset || !plan) throw new Error('El plan o el activo ya no existen.');

      await dbTx.transaction(async (tx) => {
        const consecutivo = await nextCode(tx, tenantId, 'OT');
        const [ot] = await tx
          .insert(workOrders)
          .values({
            tenantId,
            consecutivo,
            origen: 'PLAN',
            assetId: asset.id,
            locationId: asset.locationId,
            costCenterId: asset.costCenterId,
            responsibleCenterId: asset.responsibleCenterId,
            maintenanceTypeId: plan.maintenanceTypeId,
            workTypeId: plan.workTypeId,
            prioridad: plan.prioridad,
            criticidad: asset.criticidad,
            descripcionProblema: `Generada automáticamente por el plan ${plan.codigo} — ${plan.nombre}.`,
            estado: 'PLANIFICADA',
            fechaProgramada: candidato.fechaProbable,
            tiempoEstimadoHoras: plan.tiempoEstimadoHoras,
          })
          .returning({ id: workOrders.id });

        const otId = ot?.id;
        if (!otId) throw new Error('No se pudo crear la orden de trabajo.');

        const tareas = await tx.select().from(planTasks).where(eq(planTasks.planId, plan.id)).orderBy(planTasks.orden);
        if (tareas.length > 0) {
          const { woTasks } = await import('@/db/schema');
          await tx.insert(woTasks).values(
            tareas.map((t) => ({
              workOrderId: otId,
              orden: t.orden,
              descripcion: t.descripcion,
              tipoRespuesta: t.tipoRespuesta,
              esCritica: t.esCritica,
            })),
          );
        }

        const materialesPrevistos = await tx.select().from(planResources).where(and(eq(planResources.planId, plan.id), eq(planResources.tipo, 'MATERIAL')));
        if (materialesPrevistos.length > 0) {
          const { woMaterials } = await import('@/db/schema');
          await tx.insert(woMaterials).values(
            materialesPrevistos
              .filter((r) => r.materialId && r.cantidadEstimada)
              .map((r) => ({ workOrderId: otId, materialId: r.materialId!, cantidadSolicitada: r.cantidadEstimada! })),
          );
        }

        await tx.insert(planGenerationLog).values({
          planId: candidato.planId,
          triggerId: candidato.triggerId,
          assetId: candidato.assetId,
          workOrderId: otId,
          resultado: 'GENERADA',
          fechaProyectada: candidato.fechaProbable,
          lecturaMedidor: candidato.lecturaMedidor,
          detalle: candidato.motivo,
        });
      });

      generadas++;
    } catch (error) {
      errores.push({ key: candidato.key, error: error instanceof Error ? error.message : 'Error desconocido.' });
      await db.insert(planGenerationLog).values({
        planId: candidato.planId,
        triggerId: candidato.triggerId,
        assetId: candidato.assetId,
        resultado: 'ERROR',
        fechaProyectada: candidato.fechaProbable,
        lecturaMedidor: candidato.lecturaMedidor,
        detalle: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  }

  return { generadas, omitidas, errores };
}
