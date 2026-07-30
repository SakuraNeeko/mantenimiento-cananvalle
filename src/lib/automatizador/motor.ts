import { and, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assetMeters,
  automationRules,
  automationRuns,
  contracts,
  downtimes,
  meterReadings,
  notifications,
  serviceRequests,
  warehouseStock,
  webhookDeliveries,
  woStatusHistory,
  workOrders,
  type AutomationRule,
} from '@/db/schema';
import { enviarEmail } from '@/lib/email/send';
import { evaluarCondiciones, type AccionRegla, type CondicionesRegla } from './reglas';

type Candidato = { entidadId: string; claveDedupe: string; entidad: string; fila: Record<string, unknown> };

const VENTANA_EVENTOS_DIAS = 30;
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'] as const;
const hoyISO = () => new Date().toISOString().slice(0, 10);

async function candidatosOtCreada(tenantId: string): Promise<Candidato[]> {
  const desde = new Date(Date.now() - VENTANA_EVENTOS_DIAS * 86_400_000);
  const filas = await db
    .select({ id: workOrders.id, prioridad: workOrders.prioridad, criticidad: workOrders.criticidad, origen: workOrders.origen })
    .from(workOrders)
    .where(and(eq(workOrders.tenantId, tenantId), gte(workOrders.createdAt, desde), isNull(workOrders.deletedAt)));

  return filas.map((f) => ({ entidadId: f.id, claveDedupe: f.id, entidad: 'work_orders', fila: f }));
}

async function candidatosOtCambioEstado(tenantId: string): Promise<Candidato[]> {
  const desde = new Date(Date.now() - VENTANA_EVENTOS_DIAS * 86_400_000);
  const filas = await db
    .select({
      id: woStatusHistory.id,
      workOrderId: woStatusHistory.workOrderId,
      estadoNuevo: woStatusHistory.estadoNuevo,
      prioridad: workOrders.prioridad,
      criticidad: workOrders.criticidad,
    })
    .from(woStatusHistory)
    .innerJoin(workOrders, eq(workOrders.id, woStatusHistory.workOrderId))
    .where(and(eq(workOrders.tenantId, tenantId), gte(woStatusHistory.fecha, desde)));

  return filas.map((f) => ({ entidadId: f.workOrderId, claveDedupe: f.id, entidad: 'work_orders', fila: f }));
}

async function candidatosSsCreada(tenantId: string): Promise<Candidato[]> {
  const desde = new Date(Date.now() - VENTANA_EVENTOS_DIAS * 86_400_000);
  const filas = await db
    .select({ id: serviceRequests.id, prioridad: serviceRequests.prioridad, estado: serviceRequests.estado })
    .from(serviceRequests)
    .where(and(eq(serviceRequests.tenantId, tenantId), gte(serviceRequests.createdAt, desde), isNull(serviceRequests.deletedAt)));

  return filas.map((f) => ({ entidadId: f.id, claveDedupe: f.id, entidad: 'service_requests', fila: f }));
}

async function candidatosMedidorFueraRango(tenantId: string): Promise<Candidato[]> {
  const filas = await db
    .select({
      id: meterReadings.id,
      assetMeterId: meterReadings.assetMeterId,
      valor: meterReadings.valor,
      rangoMin: assetMeters.rangoMin,
      rangoMax: assetMeters.rangoMax,
      assetId: assetMeters.assetId,
    })
    .from(meterReadings)
    .innerJoin(assetMeters, eq(assetMeters.id, meterReadings.assetMeterId))
    .where(
      and(
        eq(assetMeters.tenantId, tenantId),
        sql`(${assetMeters.rangoMin} IS NOT NULL OR ${assetMeters.rangoMax} IS NOT NULL)`,
        sql`(${assetMeters.rangoMin} IS NOT NULL AND ${meterReadings.valor} < ${assetMeters.rangoMin}) OR (${assetMeters.rangoMax} IS NOT NULL AND ${meterReadings.valor} > ${assetMeters.rangoMax})`,
      ),
    );

  return filas.map((f) => ({ entidadId: f.id, claveDedupe: f.id, entidad: 'meter_readings', fila: f }));
}

async function candidatosStockBajoMinimo(tenantId: string): Promise<Candidato[]> {
  const filas = await db
    .select({ id: warehouseStock.id, cantidad: warehouseStock.cantidad, minimo: warehouseStock.minimo, materialId: warehouseStock.materialId, warehouseId: warehouseStock.warehouseId })
    .from(warehouseStock)
    .where(and(eq(warehouseStock.tenantId, tenantId), sql`${warehouseStock.minimo} IS NOT NULL AND ${warehouseStock.cantidad} < ${warehouseStock.minimo}`));

  return filas.map((f) => ({ entidadId: f.id, claveDedupe: `${f.id}-${hoyISO()}`, entidad: 'warehouse_stock', fila: f }));
}

async function candidatosOtVencida(tenantId: string): Promise<Candidato[]> {
  const filas = await db
    .select({ id: workOrders.id, fechaProgramada: workOrders.fechaProgramada, prioridad: workOrders.prioridad, estado: workOrders.estado })
    .from(workOrders)
    .where(
      and(
        eq(workOrders.tenantId, tenantId),
        isNull(workOrders.deletedAt),
        lt(workOrders.fechaProgramada, new Date()),
        sql`${workOrders.estado} NOT IN ('CERRADA', 'EN_HISTORIA', 'CANCELADA')`,
      ),
    );

  return filas.map((f) => {
    const diasVencida = f.fechaProgramada ? Math.floor((Date.now() - f.fechaProgramada.getTime()) / 86_400_000) : 0;
    return { entidadId: f.id, claveDedupe: `${f.id}-${hoyISO()}`, entidad: 'work_orders', fila: { ...f, diasVencida } };
  });
}

async function candidatosContratoPorVencer(tenantId: string): Promise<Candidato[]> {
  const filas = await db
    .select({ id: contracts.id, vigenciaFin: contracts.vigenciaFin, diasAlertaVencimiento: contracts.diasAlertaVencimiento, monto: contracts.monto, partyId: contracts.partyId })
    .from(contracts)
    .where(and(eq(contracts.tenantId, tenantId), eq(contracts.activo, true), isNull(contracts.deletedAt)));

  const hoy = new Date();
  return filas
    .filter((f) => f.vigenciaFin)
    .map((f) => {
      const vencimiento = new Date(f.vigenciaFin!);
      const diasParaVencer = Math.floor((vencimiento.getTime() - hoy.getTime()) / 86_400_000);
      return { diasParaVencer, f };
    })
    .filter(({ diasParaVencer, f }) => diasParaVencer <= f.diasAlertaVencimiento)
    .map(({ diasParaVencer, f }) => ({ entidadId: f.id, claveDedupe: `${f.id}-${hoyISO()}`, entidad: 'contracts', fila: { ...f, diasParaVencer } }));
}

async function candidatosParoExcedeHoras(tenantId: string, umbralHoras: number): Promise<Candidato[]> {
  const filas = await db
    .select({ id: downtimes.id, fechaInicio: downtimes.fechaInicio, tipo: downtimes.tipo, assetId: downtimes.assetId })
    .from(downtimes)
    .where(and(eq(downtimes.tenantId, tenantId), eq(downtimes.estado, 'ABIERTO')));

  return filas
    .map((f) => ({ f, horasAbierto: (Date.now() - f.fechaInicio.getTime()) / 3_600_000 }))
    .filter(({ horasAbierto }) => horasAbierto >= (umbralHoras || 0))
    .map(({ f, horasAbierto }) => ({ entidadId: f.id, claveDedupe: `${f.id}-${hoyISO()}`, entidad: 'downtimes', fila: { ...f, horasAbierto: Math.floor(horasAbierto) } }));
}

async function obtenerCandidatos(tenantId: string, regla: AutomationRule): Promise<Candidato[]> {
  switch (regla.disparadorTipo) {
    case 'OT_CREADA':
      return candidatosOtCreada(tenantId);
    case 'OT_CAMBIO_ESTADO':
      return candidatosOtCambioEstado(tenantId);
    case 'SS_CREADA':
      return candidatosSsCreada(tenantId);
    case 'MEDIDOR_FUERA_RANGO':
      return candidatosMedidorFueraRango(tenantId);
    case 'STOCK_BAJO_MINIMO':
      return candidatosStockBajoMinimo(tenantId);
    case 'OT_VENCIDA':
      return candidatosOtVencida(tenantId);
    case 'CONTRATO_POR_VENCER':
      return candidatosContratoPorVencer(tenantId);
    case 'PARO_EXCEDE_HORAS':
      return candidatosParoExcedeHoras(tenantId, regla.umbral ?? 0);
    default:
      return [];
  }
}

async function ejecutarAcciones(tenantId: string, regla: AutomationRule, candidato: Candidato): Promise<Record<string, unknown>[]> {
  const acciones = (regla.acciones as AccionRegla[]) ?? [];
  const detalle: Record<string, unknown>[] = [];

  for (const accion of acciones) {
    switch (accion.tipo) {
      case 'EMAIL': {
        const destinatarios = accion.destinatarios.split(',').map((d) => d.trim()).filter(Boolean);
        const resultado = await enviarEmail({ destinatarios, asunto: accion.asunto, cuerpo: accion.cuerpo });
        detalle.push({ tipo: 'EMAIL', ok: resultado.ok, error: resultado.ok ? undefined : resultado.error });
        break;
      }
      case 'NOTIFICACION': {
        await db.insert(notifications).values({
          tenantId,
          userId: accion.userId,
          tipo: 'AUTOMATIZACION',
          titulo: accion.titulo,
          cuerpo: accion.cuerpo,
          entidad: candidato.entidad,
          entidadId: candidato.entidadId,
        });
        detalle.push({ tipo: 'NOTIFICACION', ok: true });
        break;
      }
      case 'CREAR_OT': {
        const assetId = typeof candidato.fila.assetId === 'string' ? candidato.fila.assetId : null;
        await db.insert(workOrders).values({
          tenantId,
          origen: 'AUTOMATIZACION',
          assetId,
          descripcionProblema: `[Automatizador: ${regla.nombre}] ${accion.descripcionProblema}`,
          estado: 'BORRADOR',
          prioridad: (accion.prioridad as (typeof PRIORIDADES)[number]) ?? 'MEDIA',
          criticidad: 'B',
        });
        detalle.push({ tipo: 'CREAR_OT', ok: true });
        break;
      }
      case 'CAMBIAR_RESPONSABLE': {
        if (candidato.entidad === 'work_orders') {
          await db.update(workOrders).set({ responsablePrincipalUserId: accion.responsableUserId }).where(and(eq(workOrders.id, candidato.entidadId), eq(workOrders.tenantId, tenantId)));
        }
        detalle.push({ tipo: 'CAMBIAR_RESPONSABLE', ok: candidato.entidad === 'work_orders' });
        break;
      }
      case 'ESCALAR_PRIORIDAD': {
        if (candidato.entidad === 'work_orders') {
          const [ot] = await db.select({ prioridad: workOrders.prioridad }).from(workOrders).where(eq(workOrders.id, candidato.entidadId)).limit(1);
          const indice = ot ? PRIORIDADES.indexOf(ot.prioridad as (typeof PRIORIDADES)[number]) : -1;
          if (indice >= 0 && indice < PRIORIDADES.length - 1) {
            await db.update(workOrders).set({ prioridad: PRIORIDADES[indice + 1] }).where(eq(workOrders.id, candidato.entidadId));
          }
        }
        detalle.push({ tipo: 'ESCALAR_PRIORIDAD', ok: candidato.entidad === 'work_orders' });
        break;
      }
      case 'WEBHOOK': {
        const payload = { regla: regla.nombre, disparador: regla.disparadorTipo, entidad: candidato.entidad, entidadId: candidato.entidadId, fila: candidato.fila };
        let statusCode: number | null = null;
        let ok = false;
        let error: string | null = null;
        try {
          const respuesta = await fetch(accion.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          statusCode = respuesta.status;
          ok = respuesta.ok;
        } catch (e) {
          error = e instanceof Error ? e.message : 'Error de red desconocido.';
        }
        await db.insert(webhookDeliveries).values({ tenantId, ruleId: regla.id, url: accion.url, payload, statusCode, ok, error });
        detalle.push({ tipo: 'WEBHOOK', ok });
        break;
      }
    }
  }

  return detalle;
}

/** Punto de entrada: llamado por el cron `/api/cron/evaluar-automatizacion` (mismo patrón que `evaluarGeneracion`/`confirmarCandidatos` de la Fase 7). */
export async function evaluarReglas(tenantId: string): Promise<{ reglasEvaluadas: number; ejecuciones: number; errores: number }> {
  const reglas = await db.select().from(automationRules).where(and(eq(automationRules.tenantId, tenantId), eq(automationRules.activo, true), isNull(automationRules.deletedAt)));

  let ejecuciones = 0;
  let errores = 0;

  for (const regla of reglas) {
    const candidatos = await obtenerCandidatos(tenantId, regla);

    for (const candidato of candidatos) {
      if (!evaluarCondiciones(candidato.fila, regla.condiciones as CondicionesRegla)) continue;

      const [yaProcesado] = await db
        .select({ id: automationRuns.id })
        .from(automationRuns)
        .where(and(eq(automationRuns.ruleId, regla.id), eq(automationRuns.claveDedupe, candidato.claveDedupe)))
        .limit(1);
      if (yaProcesado) continue;

      const inicio = Date.now();
      try {
        const detalle = await ejecutarAcciones(tenantId, regla, candidato);
        await db.insert(automationRuns).values({
          tenantId,
          ruleId: regla.id,
          entidad: candidato.entidad,
          entidadId: candidato.entidadId,
          claveDedupe: candidato.claveDedupe,
          resultado: 'EJECUTADA',
          detalle,
          duracionMs: Date.now() - inicio,
        });
        ejecuciones++;
      } catch (error) {
        await db.insert(automationRuns).values({
          tenantId,
          ruleId: regla.id,
          entidad: candidato.entidad,
          entidadId: candidato.entidadId,
          claveDedupe: candidato.claveDedupe,
          resultado: 'ERROR',
          detalle: [{ error: error instanceof Error ? error.message : String(error) }],
          duracionMs: Date.now() - inicio,
        });
        errores++;
      }
    }

    await db.update(automationRules).set({ ultimaEvaluacionAt: new Date() }).where(eq(automationRules.id, regla.id));
  }

  return { reglasEvaluadas: reglas.length, ejecuciones, errores };
}
