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

/** Clase del activo (§4.3 del prompt maestro). */
export const assetClaseEnum = pgEnum('asset_clase', ['EQUIPO', 'VEHICULO', 'INFRAESTRUCTURA', 'TI', 'BIOMEDICO', 'HERRAMIENTA']);

/** Estado operativo: alimenta el cálculo de disponibilidad (MTBF/MTTR) en fases posteriores. */
export const assetEstadoEnum = pgEnum('asset_estado', ['OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'DADO_DE_BAJA']);

/** Tipo de documento adjunto a un activo. */
export const assetDocumentoTipoEnum = pgEnum('asset_documento_tipo', ['MANUAL', 'PLANO', 'CERTIFICADO', 'GARANTIA', 'OTRO']);

/** Origen de una lectura de medidor. */
export const meterReadingOrigenEnum = pgEnum('meter_reading_origen', ['MANUAL', 'MOVIL', 'API']);

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
