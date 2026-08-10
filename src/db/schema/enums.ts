import { pgEnum } from 'drizzle-orm/pg-core';

/** Alcance de datos de una asignación rol→usuario. */
export const scopeEnum = pgEnum('scope', ['PROPIO', 'SEDE', 'TENANT']);

/** Acción registrada en la bitácora de auditoría. */
export const auditActionEnum = pgEnum('audit_action', ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT']);

/** Severidad del registro de auditoría. Los permisos sensibles escriben CRITICO. */
export const auditLevelEnum = pgEnum('audit_level', ['INFO', 'CRITICO']);

/** Canal de una notificación. */
export const notificationChannelEnum = pgEnum('notification_channel', ['IN_APP', 'EMAIL', 'AMBOS', 'NINGUNO']);

/**
 * Estados de la Orden de Trabajo.
 * Decisión P-02: NO existe el estado APROBADA; PLANIFICADA pasa directo a ASIGNADA.
 * Se declara aquí (Fase 1) porque `audit_log` y el automatizador lo referencian.
 */
export const woStatusEnum = pgEnum('wo_status', [
  'BORRADOR',
  'PLANIFICADA',
  'ASIGNADA',
  'EN_EJECUCION',
  'PENDIENTE',
  'EJECUTADA',
  'LIQUIDADA',
  'CERRADA',
  'EN_HISTORIA',
  'CANCELADA',
]);

/** Estados de la Solicitud de Servicio. */
export const srStatusEnum = pgEnum('sr_status', [
  'BORRADOR',
  'ENVIADA',
  'EN_REVISION',
  'APROBADA',
  'RECHAZADA',
  'ASIGNADA',
  'EN_ATENCION',
  'RESUELTA',
  'CERRADA',
  'CONVERTIDA_EN_OT',
]);

/** Prioridad transversal (OT, SS, planes). */
export const priorityEnum = pgEnum('priority', ['BAJA', 'MEDIA', 'ALTA', 'URGENTE']);

/** Criticidad del activo. A = rojo, B = ámbar, C = verde. */
export const criticalityEnum = pgEnum('criticality', ['A', 'B', 'C']);

/* -------------------------------------------------------------------------- */
/* FASE 2 — INFRAESTRUCTURA                                                   */
/* -------------------------------------------------------------------------- */

/** Tipo de tercero en el catálogo `parties`. Uno puede tener varios roles a la vez en la operación real, pero aquí se clasifica por su rol principal. */
export const partyTipoEnum = pgEnum('party_tipo', ['PROVEEDOR', 'CONTRATISTA', 'FABRICANTE', 'CLIENTE']);

/** Cómo se interpreta la lectura de un contador (`meters`). */
export const meterTipoLecturaEnum = pgEnum('meter_tipo_lectura', ['HOROMETRO', 'ODOMETRO', 'CICLOS', 'M3', 'OTRO']);

/** Tipo de dato de una característica dinámica (`characteristics`). */
export const characteristicTipoDatoEnum = pgEnum('characteristic_tipo_dato', [
  'TEXTO',
  'NUMERO',
  'BOOLEANO',
  'FECHA',
  'OPCION',
]);

/** Signo del concepto de kárdex: si suma o resta existencia. */
export const kardexSignoEnum = pgEnum('kardex_signo', ['ENTRADA', 'SALIDA']);

/** Estado de un job de importación masiva (Excel). */
export const importJobEstadoEnum = pgEnum('import_job_estado', ['PROCESANDO', 'COMPLETADO', 'CON_ERRORES', 'FALLIDO']);

/* -------------------------------------------------------------------------- */
/* FASE 3 — ACTIVOS                                                           */
/* -------------------------------------------------------------------------- */

/** Estado operativo: alimenta el cálculo de disponibilidad (MTBF/MTTR) en fases posteriores. */
export const assetEstadoEnum = pgEnum('asset_estado', ['OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'DADO_DE_BAJA']);

/** Tipo de documento adjunto a un activo. */
export const assetDocumentoTipoEnum = pgEnum('asset_documento_tipo', ['MANUAL', 'PLANO', 'CERTIFICADO', 'GARANTIA', 'OTRO']);

/** Origen de una lectura de medidor. */
export const meterReadingOrigenEnum = pgEnum('meter_reading_origen', ['MANUAL', 'MOVIL', 'API', 'COMBUSTIBLE']);

/* -------------------------------------------------------------------------- */
/* FASE 4 — ALMACÉN Y KÁRDEX                                                  */
/* -------------------------------------------------------------------------- */

/** Tipo de material (§4.4 del prompt maestro). */
export const materialTipoEnum = pgEnum('material_tipo', ['REPUESTO', 'INSUMO', 'HERRAMIENTA', 'EPP']);

/**
 * Estado del movimiento de kárdex. Regla de oro: un CONFIRMADO nunca se
 * edita ni se borra — se anula con un contra-movimiento (D-0X, §4.4).
 */
export const kardexMovementEstadoEnum = pgEnum('kardex_movement_estado', ['BORRADOR', 'CONFIRMADO', 'ANULADO']);

/** Estado de una toma de inventario físico. */
export const physicalInventoryEstadoEnum = pgEnum('physical_inventory_estado', ['BORRADOR', 'CONFIRMADO']);

/* -------------------------------------------------------------------------- */
/* FASE 6 — ÓRDENES DE TRABAJO                                                */
/* -------------------------------------------------------------------------- */

/** De dónde nació la OT. PLAN (Fase 7) y PARO (Fase 8) quedan declarados para cuando existan esos módulos. */
export const woOrigenEnum = pgEnum('wo_origen', ['MANUAL', 'PLAN', 'SS', 'PARO', 'AUTOMATIZACION']);

/** Tipo de respuesta esperada en un ítem del checklist. */
export const woTaskTipoRespuestaEnum = pgEnum('wo_task_tipo_respuesta', ['OK_NO_OK', 'NUMERICO', 'TEXTO', 'FOTO', 'FIRMA']);

/* -------------------------------------------------------------------------- */
/* FASE 7 — PLANES Y GENERACIÓN AUTOMÁTICA                                    */
/* -------------------------------------------------------------------------- */

/** A qué activos aplica el plan: uno solo, o un grupo definido por filtros. */
export const planAlcanceEnum = pgEnum('plan_alcance', ['ACTIVO_UNICO', 'GRUPO']);

/**
 * Tipo de disparador. CALENDARIO y CONTADOR se evalúan automáticamente en el
 * cron (§7.1 del prompt maestro); CONDICION y EVENTO quedan declarados en el
 * modelo pero su evaluación automática se difiere (ver deuda técnica de la
 * Fase 7): requieren, respectivamente, un feed de lecturas de condición/IoT
 * y el módulo de Paros (Fase 8) para disparar sobre el cierre de una OT.
 */
export const planTriggerTipoEnum = pgEnum('plan_trigger_tipo', ['CALENDARIO', 'CONTADOR', 'CONDICION', 'EVENTO']);

/** Unidad del intervalo de un disparador de calendario. */
export const planIntervaloUnidadEnum = pgEnum('plan_intervalo_unidad', ['DIAS', 'SEMANAS', 'MESES', 'ANIOS']);

/** Fijo: reprograma desde la fecha teórica. Flotante: desde la fecha real de ejecución. */
export const planReprogramacionModoEnum = pgEnum('plan_reprogramacion_modo', ['FIJO', 'FLOTANTE']);

/** Tipo de recurso previsto de un plan: mano de obra u material. */
export const planResourceTipoEnum = pgEnum('plan_resource_tipo', ['MANO_OBRA', 'MATERIAL']);

/** Resultado de cada evaluación de generación, para la trazabilidad de `plan_generation_log`. */
export const planGenerationResultadoEnum = pgEnum('plan_generation_resultado', [
  'GENERADA',
  'OMITIDA_DUPLICADO',
  'OMITIDA_SIN_PROYECCION',
  'OMITIDA_INACTIVO',
  'ERROR',
]);

/* -------------------------------------------------------------------------- */
/* FASE 8 — PAROS / AVERÍAS                                                   */
/* -------------------------------------------------------------------------- */

/** Programado (mantenimiento planeado que detiene el equipo) o no programado (falla). Alimenta MTBF/MTTR (Fase 9). */
export const downtimeTipoEnum = pgEnum('downtime_tipo', ['PROGRAMADO', 'NO_PROGRAMADO']);

/** Un paro es simple: está abierto (en curso) o ya se cerró con su fecha de fin. */
export const downtimeEstadoEnum = pgEnum('downtime_estado', ['ABIERTO', 'CERRADO']);

/* -------------------------------------------------------------------------- */
/* FASE 9 — HISTORIA Y KPIS                                                   */
/* -------------------------------------------------------------------------- */

/** Granularidad del balance periódico de gestión. */
export const periodoTipoEnum = pgEnum('periodo_tipo', ['MES', 'TRIMESTRE', 'ANIO']);

/* -------------------------------------------------------------------------- */
/* FASE 10 — COMBUSTIBLES Y TECNOVIGILANCIA (módulos opcionales)              */
/* -------------------------------------------------------------------------- */

/** Tipo de registro de Tecnovigilancia (§4.11): evento propio, o alerta que llega del fabricante. */
export const adverseEventTipoEnum = pgEnum('adverse_event_tipo', ['EVENTO_ADVERSO', 'INCIDENTE', 'ALERTA_FABRICANTE']);

/** Severidad regulatoria estándar de tecnovigilancia. */
export const adverseEventSeveridadEnum = pgEnum('adverse_event_severidad', ['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']);

export const adverseEventEstadoEnum = pgEnum('adverse_event_estado', ['ABIERTO', 'EN_GESTION', 'CERRADO']);

/* -------------------------------------------------------------------------- */
/* FASE 12 — AUTOMATIZADOR, API E INTEGRACIONES (§4.12)                       */
/* -------------------------------------------------------------------------- */

/** Los 8 disparadores del prompt maestro (§4.12). Cada uno se evalúa por barrido periódico (Vercel Cron), no por hook en tiempo real — mismo patrón que la generación de OT desde planes (Fase 7). */
export const automationDisparadorEnum = pgEnum('automation_disparador', [
  'OT_CREADA',
  'OT_CAMBIO_ESTADO',
  'SS_CREADA',
  'MEDIDOR_FUERA_RANGO',
  'STOCK_BAJO_MINIMO',
  'OT_VENCIDA',
  'CONTRATO_POR_VENCER',
  'PARO_EXCEDE_HORAS',
]);

export const automationResultadoEnum = pgEnum('automation_resultado', ['EJECUTADA', 'ERROR']);

/* -------------------------------------------------------------------------- */
/* BITÁCORA DE USO (módulo opcional)                                          */
/* -------------------------------------------------------------------------- */

/** Un registro de uso se abre al sacar el activo y se cierra al devolverlo. */
export const usageLogEstadoEnum = pgEnum('usage_log_estado', ['ABIERTO', 'CERRADO']);
