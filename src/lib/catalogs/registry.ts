import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import {
  activityTypes,
  biomedicalCharacteristics,
  characteristics,
  contracts,
  costCenters,
  currencies,
  failureCauses,
  failureEffects,
  fuels,
  kardexConcepts,
  locations,
  magnitudes,
  maintenanceTypes,
  materials,
  meters,
  operations,
  otherCostConcepts,
  parties,
  references as referencesTable,
  responsibleCenters,
  responsibles,
  risks,
  sites,
  statuses,
  taxRegimes,
  technicalActions,
  trades,
  uoms,
  users,
  wasteTypes,
  warehouses,
  woClosingCauses,
  woPendingCauses,
  workTypes,
} from '@/db/schema';

/**
 * Registro único de metadatos de los catálogos de Infraestructura (Fase 2).
 *
 * Es la fuente de verdad de la pantalla genérica: de aquí sale qué campos
 * mostrar en el formulario, qué columnas listar, si el catálogo es
 * jerárquico y de dónde vienen las opciones de cada campo de referencia.
 * Evita escribir 31 CRUD casi idénticos (§4.2 del prompt maestro).
 */

export type CampoTipo = 'texto' | 'textarea' | 'numero' | 'decimal' | 'booleano' | 'fecha' | 'enum' | 'referencia';

/** Forma mínima que debe tener cualquier tabla que sirva de origen a un campo de referencia. */
export type TablaReferenciable = {
  tabla: PgTable;
  id: PgColumn;
  tenantId: PgColumn;
  nombre: PgColumn;
  activo: PgColumn;
  deletedAt: PgColumn;
};

export type CampoDef = {
  name: string;
  label: string;
  tipo: CampoTipo;
  requerido?: boolean;
  /** Solo para tipo 'enum'. */
  opciones?: readonly { value: string; label: string }[];
  /** Solo para tipo 'referencia': de qué tabla salen las opciones (id → nombre). */
  referenciaTabla?: TablaReferenciable;
  ayuda?: string;
};

export type CatalogoDef = {
  slug: string;
  titulo: string;
  tituloSingular: string;
  descripcion: string;
  tabla: PgTable;
  /** Mapa columna lógica → PgColumn, para `buildWhere`/`buildOrderBy` (query-builder.ts). */
  columnas: Record<string, PgColumn>;
  campos: CampoDef[];
  jerarquico: boolean;
};

const CAMPOS_BASE: CampoDef[] = [
  { name: 'codigo', label: 'Código', tipo: 'texto', requerido: true },
  { name: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
  { name: 'descripcion', label: 'Descripción', tipo: 'textarea' },
  { name: 'activo', label: 'Activo', tipo: 'booleano' },
];

/** `users` y `sites` no son catálogos administrables aquí, pero sí sirven como origen de campos de referencia. */
const USERS_REF: TablaReferenciable = { tabla: users, id: users.id, tenantId: users.tenantId, nombre: users.nombre, activo: users.activo, deletedAt: users.deletedAt };
const SITES_REF: TablaReferenciable = { tabla: sites, id: sites.id, tenantId: sites.tenantId, nombre: sites.nombre, activo: sites.activo, deletedAt: sites.deletedAt };
const TRADES_REF: TablaReferenciable = { tabla: trades, id: trades.id, tenantId: trades.tenantId, nombre: trades.nombre, activo: trades.activo, deletedAt: trades.deletedAt };
const PARTIES_REF: TablaReferenciable = { tabla: parties, id: parties.id, tenantId: parties.tenantId, nombre: parties.nombre, activo: parties.activo, deletedAt: parties.deletedAt };
const UOMS_REF: TablaReferenciable = { tabla: uoms, id: uoms.id, tenantId: uoms.tenantId, nombre: uoms.nombre, activo: uoms.activo, deletedAt: uoms.deletedAt };
const MATERIALS_REF: TablaReferenciable = { tabla: materials, id: materials.id, tenantId: materials.tenantId, nombre: materials.nombre, activo: materials.activo, deletedAt: materials.deletedAt };
/** Autoreferencias de los tres catálogos jerárquicos, para el selector de "padre" en el formulario. */
const COST_CENTERS_REF: TablaReferenciable = { tabla: costCenters, id: costCenters.id, tenantId: costCenters.tenantId, nombre: costCenters.nombre, activo: costCenters.activo, deletedAt: costCenters.deletedAt };
const RESPONSIBLE_CENTERS_REF: TablaReferenciable = { tabla: responsibleCenters, id: responsibleCenters.id, tenantId: responsibleCenters.tenantId, nombre: responsibleCenters.nombre, activo: responsibleCenters.activo, deletedAt: responsibleCenters.deletedAt };
const LOCATIONS_REF: TablaReferenciable = { tabla: locations, id: locations.id, tenantId: locations.tenantId, nombre: locations.nombre, activo: locations.activo, deletedAt: locations.deletedAt };

export const CATALOGOS: CatalogoDef[] = [
  /* --- Planos, sin campos propios --------------------------------------- */
  {
    slug: 'tipos-trabajo',
    titulo: 'Tipos de trabajo',
    tituloSingular: 'tipo de trabajo',
    descripcion: 'Mecánico, eléctrico, civil, instrumentación… clasifica las órdenes de trabajo.',
    tabla: workTypes,
    columnas: { codigo: workTypes.codigo, nombre: workTypes.nombre, descripcion: workTypes.descripcion, activo: workTypes.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'tipos-mantenimiento',
    titulo: 'Tipos de mantenimiento',
    tituloSingular: 'tipo de mantenimiento',
    descripcion: 'Preventivo, correctivo, predictivo, lubricación, metrología, inspección, mejora.',
    tabla: maintenanceTypes,
    columnas: { codigo: maintenanceTypes.codigo, nombre: maintenanceTypes.nombre, descripcion: maintenanceTypes.descripcion, activo: maintenanceTypes.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'tipos-actividad',
    titulo: 'Tipos de actividad',
    tituloSingular: 'tipo de actividad',
    descripcion: 'Clasificación de las tareas dentro de una orden de trabajo.',
    tabla: activityTypes,
    columnas: { codigo: activityTypes.codigo, nombre: activityTypes.nombre, descripcion: activityTypes.descripcion, activo: activityTypes.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'otros-costos',
    titulo: 'Otros conceptos de costo',
    tituloSingular: 'concepto de costo',
    descripcion: 'Conceptos de costo distintos de mano de obra y materiales.',
    tabla: otherCostConcepts,
    columnas: { codigo: otherCostConcepts.codigo, nombre: otherCostConcepts.nombre, descripcion: otherCostConcepts.descripcion, activo: otherCostConcepts.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'causas-pendiente',
    titulo: 'Causas de OT pendiente',
    tituloSingular: 'causa de pendiente',
    descripcion: 'Por qué una orden de trabajo queda pendiente en vez de ejecutarse.',
    tabla: woPendingCauses,
    columnas: { codigo: woPendingCauses.codigo, nombre: woPendingCauses.nombre, descripcion: woPendingCauses.descripcion, activo: woPendingCauses.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'causas-cierre',
    titulo: 'Causas de cierre de OT',
    tituloSingular: 'causa de cierre',
    descripcion: 'Motivo con el que se cierra una orden de trabajo.',
    tabla: woClosingCauses,
    columnas: { codigo: woClosingCauses.codigo, nombre: woClosingCauses.nombre, descripcion: woClosingCauses.descripcion, activo: woClosingCauses.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'acciones-tecnicas',
    titulo: 'Acciones técnicas',
    tituloSingular: 'acción técnica',
    descripcion: 'Acciones técnicas normalizadas que se registran al ejecutar una OT.',
    tabla: technicalActions,
    columnas: { codigo: technicalActions.codigo, nombre: technicalActions.nombre, descripcion: technicalActions.descripcion, activo: technicalActions.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'causas-falla',
    titulo: 'Causas de falla',
    tituloSingular: 'causa de falla',
    descripcion: 'Base del análisis de fallas: por qué ocurrió.',
    tabla: failureCauses,
    columnas: { codigo: failureCauses.codigo, nombre: failureCauses.nombre, descripcion: failureCauses.descripcion, activo: failureCauses.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'efectos-falla',
    titulo: 'Efectos de falla',
    tituloSingular: 'efecto de falla',
    descripcion: 'Base del análisis de fallas: qué provocó.',
    tabla: failureEffects,
    columnas: { codigo: failureEffects.codigo, nombre: failureEffects.nombre, descripcion: failureEffects.descripcion, activo: failureEffects.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'operaciones',
    titulo: 'Operaciones',
    tituloSingular: 'operación',
    descripcion: 'Operaciones o procesos productivos a los que sirve un activo.',
    tabla: operations,
    columnas: { codigo: operations.codigo, nombre: operations.nombre, descripcion: operations.descripcion, activo: operations.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'regimenes-tributarios',
    titulo: 'Regímenes tributarios',
    tituloSingular: 'régimen tributario',
    descripcion: 'Clasificación tributaria de los terceros.',
    tabla: taxRegimes,
    columnas: { codigo: taxRegimes.codigo, nombre: taxRegimes.nombre, descripcion: taxRegimes.descripcion, activo: taxRegimes.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'estados',
    titulo: 'Estados adicionales',
    tituloSingular: 'estado',
    descripcion: 'Estados parametrizables para catálogos que lo necesiten más adelante.',
    tabla: statuses,
    columnas: { codigo: statuses.codigo, nombre: statuses.nombre, descripcion: statuses.descripcion, activo: statuses.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'combustibles',
    titulo: 'Combustibles',
    tituloSingular: 'combustible',
    descripcion: 'Tipos de combustible para el módulo de Combustibles (Fase 10).',
    tabla: fuels,
    columnas: { codigo: fuels.codigo, nombre: fuels.nombre, descripcion: fuels.descripcion, activo: fuels.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },
  {
    slug: 'tipos-residuo',
    titulo: 'Tipos de residuo',
    tituloSingular: 'tipo de residuo',
    descripcion: 'Clasificación de residuos generados por el mantenimiento.',
    tabla: wasteTypes,
    columnas: { codigo: wasteTypes.codigo, nombre: wasteTypes.nombre, descripcion: wasteTypes.descripcion, activo: wasteTypes.activo },
    campos: CAMPOS_BASE,
    jerarquico: false,
  },

  /* --- Planos, con 1-3 campos propios ------------------------------------ */
  {
    slug: 'riesgos',
    titulo: 'Riesgos',
    tituloSingular: 'riesgo',
    descripcion: 'Matriz de riesgo: probabilidad × impacto, de 1 (bajo) a 5 (alto).',
    tabla: risks,
    columnas: { codigo: risks.codigo, nombre: risks.nombre, descripcion: risks.descripcion, activo: risks.activo, probabilidad: risks.probabilidad, impacto: risks.impacto },
    campos: [
      ...CAMPOS_BASE,
      { name: 'probabilidad', label: 'Probabilidad (1-5)', tipo: 'numero', requerido: true },
      { name: 'impacto', label: 'Impacto (1-5)', tipo: 'numero', requerido: true },
    ],
    jerarquico: false,
  },
  {
    slug: 'magnitudes',
    titulo: 'Magnitudes',
    tituloSingular: 'magnitud',
    descripcion: 'Variables medibles: temperatura, vibración, presión…',
    tabla: magnitudes,
    columnas: { codigo: magnitudes.codigo, nombre: magnitudes.nombre, descripcion: magnitudes.descripcion, activo: magnitudes.activo },
    campos: [...CAMPOS_BASE, { name: 'uomId', label: 'Unidad de medida', tipo: 'referencia', referenciaTabla: UOMS_REF }],
    jerarquico: false,
  },
  {
    slug: 'caracteristicas-biomedicas',
    titulo: 'Características biomédicas',
    tituloSingular: 'característica biomédica',
    descripcion: 'Riesgo, clase y registro sanitario para equipos biomédicos (Tecnovigilancia, Fase 10).',
    tabla: biomedicalCharacteristics,
    columnas: {
      codigo: biomedicalCharacteristics.codigo,
      nombre: biomedicalCharacteristics.nombre,
      descripcion: biomedicalCharacteristics.descripcion,
      activo: biomedicalCharacteristics.activo,
    },
    campos: [
      ...CAMPOS_BASE,
      { name: 'riesgo', label: 'Riesgo', tipo: 'texto' },
      { name: 'clase', label: 'Clase', tipo: 'texto' },
      { name: 'registroSanitario', label: 'Registro sanitario (INVIMA)', tipo: 'texto' },
      { name: 'vidaUtilMeses', label: 'Vida útil (meses)', tipo: 'numero' },
    ],
    jerarquico: false,
  },
  {
    slug: 'referencias',
    titulo: 'Referencias de repuesto',
    tituloSingular: 'referencia',
    descripcion: 'Referencia de un repuesto por proveedor, vinculada al material.',
    tabla: referencesTable,
    columnas: {
      codigo: referencesTable.codigo,
      nombre: referencesTable.nombre,
      descripcion: referencesTable.descripcion,
      activo: referencesTable.activo,
    },
    campos: [
      ...CAMPOS_BASE,
      { name: 'materialId', label: 'Material', tipo: 'referencia', referenciaTabla: MATERIALS_REF },
      { name: 'partyId', label: 'Proveedor', tipo: 'referencia', referenciaTabla: PARTIES_REF },
      { name: 'codigoProveedor', label: 'Código del proveedor', tipo: 'texto' },
    ],
    jerarquico: false,
  },

  /* --- Jerárquicos --------------------------------------------------------- */
  {
    slug: 'centros-costo',
    titulo: 'Centros de costo',
    tituloSingular: 'centro de costo',
    descripcion: 'Estructura jerárquica de centros de costo, con su código contable.',
    tabla: costCenters,
    columnas: { codigo: costCenters.codigo, nombre: costCenters.nombre, descripcion: costCenters.descripcion, activo: costCenters.activo, parentId: costCenters.parentId },
    campos: [
      ...CAMPOS_BASE,
      { name: 'codigoContable', label: 'Código contable', tipo: 'texto' },
      { name: 'parentId', label: 'Centro de costo padre', tipo: 'referencia', referenciaTabla: COST_CENTERS_REF },
    ],
    jerarquico: true,
  },
  {
    slug: 'centros-responsables',
    titulo: 'Centros responsables',
    tituloSingular: 'centro responsable',
    descripcion: 'Estructura jerárquica de responsabilidad operativa.',
    tabla: responsibleCenters,
    columnas: {
      codigo: responsibleCenters.codigo,
      nombre: responsibleCenters.nombre,
      descripcion: responsibleCenters.descripcion,
      activo: responsibleCenters.activo,
      parentId: responsibleCenters.parentId,
    },
    campos: [
      ...CAMPOS_BASE,
      { name: 'responsableUserId', label: 'Responsable', tipo: 'referencia', referenciaTabla: USERS_REF },
      { name: 'parentId', label: 'Centro responsable padre', tipo: 'referencia', referenciaTabla: RESPONSIBLE_CENTERS_REF },
    ],
    jerarquico: true,
  },
  {
    slug: 'ubicaciones',
    titulo: 'Ubicaciones físicas',
    tituloSingular: 'ubicación',
    descripcion: 'Árbol ilimitado de ubicaciones: planta → edificio → piso → sala…',
    tabla: locations,
    columnas: { codigo: locations.codigo, nombre: locations.nombre, descripcion: locations.descripcion, activo: locations.activo, parentId: locations.parentId },
    campos: [
      ...CAMPOS_BASE,
      { name: 'siteId', label: 'Sede', tipo: 'referencia', referenciaTabla: SITES_REF },
      { name: 'latitud', label: 'Latitud', tipo: 'texto' },
      { name: 'longitud', label: 'Longitud', tipo: 'texto' },
      { name: 'parentId', label: 'Ubicación padre', tipo: 'referencia', referenciaTabla: LOCATIONS_REF },
    ],
    jerarquico: true,
  },

  /* --- Con campos propios extensos --------------------------------------- */
  {
    slug: 'oficios',
    titulo: 'Oficios y cargos técnicos',
    tituloSingular: 'oficio',
    descripcion: 'Costo hora normal, extra y nocturna, para valorizar la mano de obra de las OT.',
    tabla: trades,
    columnas: { codigo: trades.codigo, nombre: trades.nombre, descripcion: trades.descripcion, activo: trades.activo },
    campos: [
      ...CAMPOS_BASE,
      { name: 'costoHoraNormal', label: 'Costo hora normal', tipo: 'decimal' },
      { name: 'costoHoraExtra', label: 'Costo hora extra', tipo: 'decimal' },
      { name: 'costoHoraNocturna', label: 'Costo hora nocturna', tipo: 'decimal' },
    ],
    jerarquico: false,
  },
  {
    slug: 'terceros',
    titulo: 'Terceros',
    tituloSingular: 'tercero',
    descripcion: 'Proveedores, contratistas, fabricantes y clientes.',
    tabla: parties,
    columnas: { codigo: parties.codigo, nombre: parties.nombre, descripcion: parties.descripcion, activo: parties.activo, tipo: parties.tipo },
    campos: [
      ...CAMPOS_BASE,
      {
        name: 'tipo',
        label: 'Tipo',
        tipo: 'enum',
        requerido: true,
        opciones: [
          { value: 'PROVEEDOR', label: 'Proveedor' },
          { value: 'CONTRATISTA', label: 'Contratista' },
          { value: 'FABRICANTE', label: 'Fabricante' },
          { value: 'CLIENTE', label: 'Cliente' },
        ],
      },
      { name: 'ruc', label: 'RUC', tipo: 'texto' },
      { name: 'contactoNombre', label: 'Contacto', tipo: 'texto' },
      { name: 'contactoEmail', label: 'Correo de contacto', tipo: 'texto' },
      { name: 'contactoTelefono', label: 'Teléfono de contacto', tipo: 'texto' },
      { name: 'tipoRegimen', label: 'Régimen', tipo: 'texto' },
    ],
    jerarquico: false,
  },
  {
    slug: 'responsables',
    titulo: 'Responsables',
    tituloSingular: 'responsable',
    descripcion: 'Personas que ejecutan trabajos, vinculadas o no a un usuario del sistema.',
    tabla: responsibles,
    columnas: { codigo: responsibles.codigo, nombre: responsibles.nombre, descripcion: responsibles.descripcion, activo: responsibles.activo },
    campos: [
      ...CAMPOS_BASE,
      { name: 'userId', label: 'Usuario del sistema', tipo: 'referencia', referenciaTabla: USERS_REF },
      { name: 'tradeId', label: 'Oficio', tipo: 'referencia', referenciaTabla: TRADES_REF },
      { name: 'disponible', label: 'Disponible', tipo: 'booleano' },
      { name: 'costoHora', label: 'Costo hora', tipo: 'decimal' },
    ],
    jerarquico: false,
  },
  {
    slug: 'contratos',
    titulo: 'Contratos',
    tituloSingular: 'contrato',
    descripcion: 'Contratos con terceros: vigencia, monto y alcance, con alerta de vencimiento.',
    tabla: contracts,
    columnas: { codigo: contracts.codigo, nombre: contracts.nombre, descripcion: contracts.descripcion, activo: contracts.activo },
    campos: [
      ...CAMPOS_BASE,
      { name: 'partyId', label: 'Tercero', tipo: 'referencia', requerido: true, referenciaTabla: PARTIES_REF },
      { name: 'vigenciaInicio', label: 'Vigencia desde', tipo: 'fecha' },
      { name: 'vigenciaFin', label: 'Vigencia hasta', tipo: 'fecha' },
      { name: 'monto', label: 'Monto', tipo: 'decimal' },
      { name: 'alcance', label: 'Alcance', tipo: 'textarea' },
      { name: 'diasAlertaVencimiento', label: 'Días de alerta antes de vencer', tipo: 'numero' },
    ],
    jerarquico: false,
  },
  {
    slug: 'almacenes',
    titulo: 'Almacenes',
    tituloSingular: 'almacén',
    descripcion: 'Uno o más almacenes físicos por sede.',
    tabla: warehouses,
    columnas: { codigo: warehouses.codigo, nombre: warehouses.nombre, descripcion: warehouses.descripcion, activo: warehouses.activo },
    campos: [
      ...CAMPOS_BASE,
      { name: 'siteId', label: 'Sede', tipo: 'referencia', requerido: true, referenciaTabla: SITES_REF },
      { name: 'responsableUserId', label: 'Responsable', tipo: 'referencia', referenciaTabla: USERS_REF },
      { name: 'permiteNegativos', label: 'Permite existencias negativas', tipo: 'booleano' },
    ],
    jerarquico: false,
  },
  {
    slug: 'unidades-medida',
    titulo: 'Unidades de medida',
    tituloSingular: 'unidad de medida',
    descripcion: 'Con su factor de conversión hacia una unidad base (ej. "caja x12" → "unidad").',
    tabla: uoms,
    columnas: { codigo: uoms.codigo, nombre: uoms.nombre, descripcion: uoms.descripcion, activo: uoms.activo },
    campos: [
      ...CAMPOS_BASE,
      { name: 'simbolo', label: 'Símbolo', tipo: 'texto' },
      { name: 'uomBaseId', label: 'Unidad base', tipo: 'referencia', referenciaTabla: UOMS_REF, ayuda: 'Vacío si esta unidad ya es la base.' },
      { name: 'factorConversion', label: 'Factor de conversión hacia la base', tipo: 'decimal' },
    ],
    jerarquico: false,
  },
  {
    slug: 'monedas',
    titulo: 'Monedas',
    tituloSingular: 'moneda',
    descripcion: 'Monedas activas del tenant. El historial de tasas se administra aparte (currency_rates).',
    tabla: currencies,
    columnas: { codigo: currencies.codigo, nombre: currencies.nombre, descripcion: currencies.descripcion, activo: currencies.activo },
    campos: [...CAMPOS_BASE, { name: 'simbolo', label: 'Símbolo', tipo: 'texto' }],
    jerarquico: false,
  },
  {
    slug: 'contadores',
    titulo: 'Contadores',
    tituloSingular: 'contador',
    descripcion: 'Horómetro, odómetro, ciclos… se asignan a los activos en la Fase 3.',
    tabla: meters,
    columnas: { codigo: meters.codigo, nombre: meters.nombre, descripcion: meters.descripcion, activo: meters.activo },
    campos: [
      ...CAMPOS_BASE,
      {
        name: 'tipoLectura',
        label: 'Tipo de lectura',
        tipo: 'enum',
        requerido: true,
        opciones: [
          { value: 'HOROMETRO', label: 'Horómetro' },
          { value: 'ODOMETRO', label: 'Odómetro' },
          { value: 'CICLOS', label: 'Ciclos' },
          { value: 'M3', label: 'm³' },
          { value: 'OTRO', label: 'Otro' },
        ],
      },
      { name: 'uomId', label: 'Unidad de medida', tipo: 'referencia', referenciaTabla: UOMS_REF },
      { name: 'permiteRetroceso', label: 'Permite retroceso en la lectura', tipo: 'booleano' },
    ],
    jerarquico: false,
  },
  {
    slug: 'caracteristicas',
    titulo: 'Características',
    tituloSingular: 'característica',
    descripcion: 'Plantillas de atributos dinámicos por clase de activo (ficha técnica, Fase 3).',
    tabla: characteristics,
    columnas: { codigo: characteristics.codigo, nombre: characteristics.nombre, descripcion: characteristics.descripcion, activo: characteristics.activo },
    campos: [
      ...CAMPOS_BASE,
      {
        name: 'tipoDato',
        label: 'Tipo de dato',
        tipo: 'enum',
        requerido: true,
        opciones: [
          { value: 'TEXTO', label: 'Texto' },
          { value: 'NUMERO', label: 'Número' },
          { value: 'BOOLEANO', label: 'Sí/No' },
          { value: 'FECHA', label: 'Fecha' },
          { value: 'OPCION', label: 'Lista de opciones' },
        ],
      },
      { name: 'claseActivo', label: 'Clase de activo', tipo: 'texto', ayuda: 'Ej. "Equipo biomédico", "Vehículo". Vacío = aplica a todas.' },
    ],
    jerarquico: false,
  },
  {
    slug: 'conceptos-kardex',
    titulo: 'Conceptos de kárdex',
    tituloSingular: 'concepto de kárdex',
    descripcion: 'El catálogo más crítico del módulo: define cada tipo de movimiento y su signo.',
    tabla: kardexConcepts,
    columnas: { codigo: kardexConcepts.codigo, nombre: kardexConcepts.nombre, descripcion: kardexConcepts.descripcion, activo: kardexConcepts.activo },
    campos: [
      ...CAMPOS_BASE,
      {
        name: 'signo',
        label: 'Signo',
        tipo: 'enum',
        requerido: true,
        opciones: [
          { value: 'ENTRADA', label: 'Entrada (+)' },
          { value: 'SALIDA', label: 'Salida (-)' },
        ],
      },
      { name: 'exigeOt', label: 'Exige orden de trabajo', tipo: 'booleano' },
      { name: 'exigeTercero', label: 'Exige tercero', tipo: 'booleano' },
      { name: 'afectaCostoPromedio', label: 'Afecta el costo promedio', tipo: 'booleano' },
    ],
    jerarquico: false,
  },
];

export function getCatalogo(slug: string): CatalogoDef | undefined {
  return CATALOGOS.find((c) => c.slug === slug);
}

export const CATALOGO_SLUGS = CATALOGOS.map((c) => c.slug);
