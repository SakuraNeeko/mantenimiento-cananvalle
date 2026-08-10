/**
 * CATÁLOGO ÚNICO DE PERMISOS — fuente de verdad del RBAC.
 *
 * Convención: `modulo.recurso.accion`.
 * `sensible: true` (🔒) ⇒ re-confirmación en la UI + audit_log nivel CRITICO.
 *
 * Cualquier permiso nuevo se añade AQUÍ y se propaga con `pnpm db:seed`,
 * que hace upsert en `permissions` y elimina los que ya no existan.
 *
 * Cambio aprobado (respuesta P-02): se elimina `ordenes.aprobar`; la OT pasa
 * de PLANIFICADA directo a ASIGNADA.
 */

export type PermissionDef = {
  codigo: string;
  modulo: string;
  descripcion: string;
  sensible?: boolean;
};

export const PERMISSIONS = [
  /* --- ADMINISTRACIÓN ------------------------------------------------- */
  { codigo: 'admin.usuarios.ver', modulo: 'Administración', descripcion: 'Ver usuarios' },
  { codigo: 'admin.usuarios.gestionar', modulo: 'Administración', descripcion: 'Crear, editar y desactivar usuarios', sensible: true },
  { codigo: 'admin.roles.gestionar', modulo: 'Administración', descripcion: 'Crear roles y asignar permisos', sensible: true },
  { codigo: 'admin.parametros.editar', modulo: 'Administración', descripcion: 'Editar parámetros de la empresa', sensible: true },
  { codigo: 'admin.secuencias.editar', modulo: 'Administración', descripcion: 'Editar máscaras de consecutivos', sensible: true },
  { codigo: 'admin.modulos.activar', modulo: 'Administración', descripcion: 'Activar o desactivar módulos opcionales', sensible: true },
  { codigo: 'admin.auditoria.ver', modulo: 'Administración', descripcion: 'Consultar la bitácora de auditoría' },
  { codigo: 'admin.integraciones.gestionar', modulo: 'Administración', descripcion: 'Configurar webhooks e integraciones', sensible: true },
  { codigo: 'admin.apikeys.gestionar', modulo: 'Administración', descripcion: 'Emitir y revocar claves de API', sensible: true },

  /* --- INFRAESTRUCTURA ------------------------------------------------ */
  { codigo: 'infra.catalogos.ver', modulo: 'Infraestructura', descripcion: 'Consultar catálogos' },
  { codigo: 'infra.catalogos.crear', modulo: 'Infraestructura', descripcion: 'Crear registros de catálogo' },
  { codigo: 'infra.catalogos.editar', modulo: 'Infraestructura', descripcion: 'Editar registros de catálogo' },
  { codigo: 'infra.catalogos.eliminar', modulo: 'Infraestructura', descripcion: 'Eliminar registros de catálogo', sensible: true },
  { codigo: 'infra.tarifas.ver', modulo: 'Infraestructura', descripcion: 'Ver costos hora de oficios y responsables', sensible: true },
  { codigo: 'infra.contratos.gestionar', modulo: 'Infraestructura', descripcion: 'Gestionar contratos con terceros' },
  { codigo: 'infra.importar', modulo: 'Infraestructura', descripcion: 'Importar catálogos desde Excel', sensible: true },
  { codigo: 'infra.exportar', modulo: 'Infraestructura', descripcion: 'Exportar catálogos' },

  /* --- ACTIVOS -------------------------------------------------------- */
  { codigo: 'activos.ver', modulo: 'Activos', descripcion: 'Consultar activos' },
  { codigo: 'activos.crear', modulo: 'Activos', descripcion: 'Crear activos' },
  { codigo: 'activos.editar', modulo: 'Activos', descripcion: 'Editar activos' },
  { codigo: 'activos.eliminar', modulo: 'Activos', descripcion: 'Eliminar activos', sensible: true },
  { codigo: 'activos.trasladar', modulo: 'Activos', descripcion: 'Trasladar activos entre ubicaciones' },
  { codigo: 'activos.costos.ver', modulo: 'Activos', descripcion: 'Ver valores y costos del activo', sensible: true },
  { codigo: 'activos.medidores.gestionar', modulo: 'Activos', descripcion: 'Asignar y configurar medidores' },
  { codigo: 'activos.lecturas.registrar', modulo: 'Activos', descripcion: 'Registrar lecturas de medidores' },
  { codigo: 'activos.documentos.gestionar', modulo: 'Activos', descripcion: 'Cargar manuales, planos y certificados' },
  { codigo: 'activos.qr.generar', modulo: 'Activos', descripcion: 'Generar e imprimir códigos QR' },
  { codigo: 'activos.hoja_vida.ver', modulo: 'Activos', descripcion: 'Consultar la hoja de vida del activo' },
  { codigo: 'activos.importar', modulo: 'Activos', descripcion: 'Importar activos desde Excel', sensible: true },
  { codigo: 'activos.exportar', modulo: 'Activos', descripcion: 'Exportar activos a Excel' },

  /* --- ALMACÉN Y KÁRDEX ----------------------------------------------- */
  { codigo: 'almacen.materiales.ver', modulo: 'Almacén', descripcion: 'Consultar materiales' },
  { codigo: 'almacen.materiales.gestionar', modulo: 'Almacén', descripcion: 'Crear y editar materiales' },
  { codigo: 'almacen.materiales.importar', modulo: 'Almacén', descripcion: 'Importar materiales desde Excel', sensible: true },
  { codigo: 'almacen.materiales.exportar', modulo: 'Almacén', descripcion: 'Exportar materiales a Excel' },
  { codigo: 'almacen.existencias.ver', modulo: 'Almacén', descripcion: 'Ver existencias por almacén' },
  { codigo: 'almacen.existencias.parametrizar', modulo: 'Almacén', descripcion: 'Definir mínimos, máximos y punto de pedido' },
  { codigo: 'almacen.kardex.ver', modulo: 'Almacén', descripcion: 'Consultar el kárdex' },
  { codigo: 'almacen.kardex.entrada', modulo: 'Almacén', descripcion: 'Registrar entradas' },
  { codigo: 'almacen.kardex.salida', modulo: 'Almacén', descripcion: 'Registrar salidas' },
  { codigo: 'almacen.kardex.confirmar', modulo: 'Almacén', descripcion: 'Confirmar movimientos (los vuelve inmutables)', sensible: true },
  { codigo: 'almacen.kardex.ajustar', modulo: 'Almacén', descripcion: 'Ajustar existencias', sensible: true },
  { codigo: 'almacen.kardex.anular', modulo: 'Almacén', descripcion: 'Anular un movimiento con contra-movimiento', sensible: true },
  { codigo: 'almacen.lotes.gestionar', modulo: 'Almacén', descripcion: 'Administrar lotes, series y vencimientos' },
  { codigo: 'almacen.costos.ver', modulo: 'Almacén', descripcion: 'Ver costo promedio y valorización', sensible: true },
  { codigo: 'almacen.inventario.ejecutar', modulo: 'Almacén', descripcion: 'Ejecutar toma física' },
  { codigo: 'almacen.inventario.aprobar', modulo: 'Almacén', descripcion: 'Aprobar ajustes por conteo', sensible: true },
  { codigo: 'almacen.compras.solicitar', modulo: 'Almacén', descripcion: 'Generar solicitudes de compra' },
  { codigo: 'almacen.compras.aprobar', modulo: 'Almacén', descripcion: 'Aprobar solicitudes y órdenes de compra', sensible: true },

  /* --- SOLICITUDES DE SERVICIO ---------------------------------------- */
  { codigo: 'solicitudes.ver', modulo: 'Solicitudes', descripcion: 'Consultar solicitudes de servicio' },
  { codigo: 'solicitudes.crear', modulo: 'Solicitudes', descripcion: 'Crear una solicitud' },
  { codigo: 'solicitudes.editar', modulo: 'Solicitudes', descripcion: 'Editar una solicitud' },
  { codigo: 'solicitudes.aprobar', modulo: 'Solicitudes', descripcion: 'Aprobar una solicitud' },
  { codigo: 'solicitudes.rechazar', modulo: 'Solicitudes', descripcion: 'Rechazar una solicitud' },
  { codigo: 'solicitudes.asignar', modulo: 'Solicitudes', descripcion: 'Asignar responsable' },
  { codigo: 'solicitudes.atender', modulo: 'Solicitudes', descripcion: 'Registrar la atención' },
  { codigo: 'solicitudes.atencion_directa', modulo: 'Solicitudes', descripcion: 'Resolver sin generar OT' },
  { codigo: 'solicitudes.convertir_ot', modulo: 'Solicitudes', descripcion: 'Convertir la solicitud en OT' },
  { codigo: 'solicitudes.cerrar', modulo: 'Solicitudes', descripcion: 'Cerrar la solicitud' },
  { codigo: 'solicitudes.calificar', modulo: 'Solicitudes', descripcion: 'Calificar el servicio recibido' },

  /* --- ÓRDENES DE TRABAJO --------------------------------------------- */
  { codigo: 'ordenes.ver', modulo: 'Órdenes', descripcion: 'Consultar órdenes de trabajo' },
  { codigo: 'ordenes.crear', modulo: 'Órdenes', descripcion: 'Crear órdenes de trabajo' },
  { codigo: 'ordenes.editar', modulo: 'Órdenes', descripcion: 'Editar órdenes de trabajo' },
  { codigo: 'ordenes.eliminar', modulo: 'Órdenes', descripcion: 'Eliminar órdenes en borrador', sensible: true },
  { codigo: 'ordenes.planificar', modulo: 'Órdenes', descripcion: 'Programar fecha y recursos' },
  { codigo: 'ordenes.asignar', modulo: 'Órdenes', descripcion: 'Asignar responsable y cuadrilla' },
  { codigo: 'ordenes.ejecutar', modulo: 'Órdenes', descripcion: 'Iniciar y ejecutar la OT' },
  { codigo: 'ordenes.tareas.registrar', modulo: 'Órdenes', descripcion: 'Registrar resultados del checklist' },
  { codigo: 'ordenes.mano_obra.propia', modulo: 'Órdenes', descripcion: 'Registrar las horas propias' },
  { codigo: 'ordenes.mano_obra.terceros', modulo: 'Órdenes', descripcion: 'Registrar horas de otros responsables' },
  { codigo: 'ordenes.materiales.solicitar', modulo: 'Órdenes', descripcion: 'Solicitar materiales al almacén' },
  { codigo: 'ordenes.costos.ver', modulo: 'Órdenes', descripcion: 'Ver los costos de la OT', sensible: true },
  { codigo: 'ordenes.costos.editar', modulo: 'Órdenes', descripcion: 'Editar costos de terceros y otros', sensible: true },
  { codigo: 'ordenes.liquidar', modulo: 'Órdenes', descripcion: 'Liquidar costos de la OT', sensible: true },
  { codigo: 'ordenes.cerrar', modulo: 'Órdenes', descripcion: 'Cerrar la OT', sensible: true },
  { codigo: 'ordenes.reabrir', modulo: 'Órdenes', descripcion: 'Reabrir una OT cerrada', sensible: true },
  { codigo: 'ordenes.cancelar', modulo: 'Órdenes', descripcion: 'Cancelar una OT', sensible: true },
  { codigo: 'ordenes.firmar.ejecutor', modulo: 'Órdenes', descripcion: 'Firmar como ejecutor' },
  { codigo: 'ordenes.firmar.aprobador', modulo: 'Órdenes', descripcion: 'Firmar como aprobador' },
  { codigo: 'ordenes.imprimir', modulo: 'Órdenes', descripcion: 'Imprimir la OT en PDF' },

  /* --- PLANES --------------------------------------------------------- */
  { codigo: 'planes.ver', modulo: 'Planes', descripcion: 'Consultar planes de mantenimiento' },
  { codigo: 'planes.gestionar', modulo: 'Planes', descripcion: 'Crear y editar planes, tareas y recursos' },
  { codigo: 'planes.activar', modulo: 'Planes', descripcion: 'Activar o desactivar un plan', sensible: true },
  { codigo: 'planes.generar_ot', modulo: 'Planes', descripcion: 'Generar órdenes desde planes', sensible: true },

  /* --- PAROS ---------------------------------------------------------- */
  { codigo: 'paros.ver', modulo: 'Paros', descripcion: 'Consultar paros y averías' },
  { codigo: 'paros.registrar', modulo: 'Paros', descripcion: 'Registrar un paro' },
  { codigo: 'paros.editar', modulo: 'Paros', descripcion: 'Editar un paro' },
  { codigo: 'paros.cerrar', modulo: 'Paros', descripcion: 'Cerrar un paro' },
  { codigo: 'paros.convertir_ot', modulo: 'Paros', descripcion: 'Generar la OT correctiva' },

  /* --- HISTORIA ------------------------------------------------------- */
  { codigo: 'historia.ver', modulo: 'Historia', descripcion: 'Consultar la historia' },
  { codigo: 'historia.enviar', modulo: 'Historia', descripcion: 'Enviar OT cerradas a historia', sensible: true },
  { codigo: 'historia.balance.calcular', modulo: 'Historia', descripcion: 'Calcular el balance periódico' },
  { codigo: 'historia.archivar', modulo: 'Historia', descripcion: 'Archivar años anteriores', sensible: true },
  { codigo: 'historia.restaurar', modulo: 'Historia', descripcion: 'Restaurar historia archivada', sensible: true },

  /* --- REPORTES ------------------------------------------------------- */
  { codigo: 'reportes.dashboard.ver', modulo: 'Reportes', descripcion: 'Ver el dashboard' },
  { codigo: 'reportes.operativos.ver', modulo: 'Reportes', descripcion: 'Ver reportes operativos' },
  { codigo: 'reportes.costos.ver', modulo: 'Reportes', descripcion: 'Ver reportes de costos', sensible: true },
  { codigo: 'reportes.exportar', modulo: 'Reportes', descripcion: 'Exportar a Excel y PDF' },
  { codigo: 'reportes.programar', modulo: 'Reportes', descripcion: 'Programar envíos por correo' },

  /* --- COMPLEMENTARIOS ------------------------------------------------ */
  { codigo: 'combustibles.ver', modulo: 'Combustibles', descripcion: 'Consultar registros de combustible' },
  { codigo: 'combustibles.registrar', modulo: 'Combustibles', descripcion: 'Registrar un abastecimiento' },
  { codigo: 'combustibles.editar', modulo: 'Combustibles', descripcion: 'Editar o anular un registro' },
  { codigo: 'tecnovigilancia.ver', modulo: 'Tecnovigilancia', descripcion: 'Consultar eventos adversos' },
  { codigo: 'tecnovigilancia.registrar', modulo: 'Tecnovigilancia', descripcion: 'Registrar un evento adverso' },
  { codigo: 'tecnovigilancia.reportar', modulo: 'Tecnovigilancia', descripcion: 'Reportar a la autoridad sanitaria', sensible: true },
  { codigo: 'automatizador.ver', modulo: 'Automatizador', descripcion: 'Consultar reglas de automatización' },
  { codigo: 'automatizador.gestionar', modulo: 'Automatizador', descripcion: 'Crear y activar reglas', sensible: true },
  { codigo: 'automatizador.bitacora.ver', modulo: 'Automatizador', descripcion: 'Ver la bitácora de ejecución' },

  /* --- BITÁCORA DE USO -------------------------------------------------- */
  { codigo: 'bitacora.ver', modulo: 'Bitácora de uso', descripcion: 'Consultar el uso registrado de los activos' },
  { codigo: 'bitacora.registrar', modulo: 'Bitácora de uso', descripcion: 'Registrar salida y regreso de un activo' },
  { codigo: 'bitacora.eliminar', modulo: 'Bitácora de uso', descripcion: 'Eliminar un registro de uso', sensible: true },
] as const satisfies readonly PermissionDef[];

/** Unión literal de todos los códigos: `requirePermission` no acepta strings sueltos. */
export type PermissionCode = (typeof PERMISSIONS)[number]['codigo'];

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.codigo) as PermissionCode[];

export const SENSITIVE_PERMISSIONS = new Set<string>(
  PERMISSIONS.filter((p) => 'sensible' in p && p.sensible).map((p) => p.codigo),
);

export function isSensitive(codigo: string): boolean {
  return SENSITIVE_PERMISSIONS.has(codigo);
}

/* -------------------------------------------------------------------------- */
/* ROLES PREDEFINIDOS                                                         */
/* -------------------------------------------------------------------------- */

/** Respuesta P-01: instancia única ⇒ NO existe el rol SOPORTE (cross-tenant). */
export const ROLE_CODES = [
  'ADMIN',
  'GERENTE',
  'PLANIF',
  'SUPERV',
  'TECNICO',
  'ALMACEN',
  'SOLIC',
  'AUDITOR',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export type ScopeValue = 'PROPIO' | 'SEDE' | 'TENANT';

export const ROLE_DEFS: Record<RoleCode, { nombre: string; descripcion: string; scope: ScopeValue }> = {
  ADMIN: { nombre: 'Administrador / TI', descripcion: 'Configura el sistema, usuarios y permisos', scope: 'TENANT' },
  GERENTE: { nombre: 'Gerente de Mantenimiento', descripcion: 'Supervisa KPIs, costos y cumplimiento', scope: 'TENANT' },
  PLANIF: { nombre: 'Planificador', descripcion: 'Programa planes y genera órdenes de trabajo', scope: 'SEDE' },
  SUPERV: { nombre: 'Supervisor de taller', descripcion: 'Asigna y supervisa la ejecución en su sede', scope: 'SEDE' },
  TECNICO: { nombre: 'Técnico', descripcion: 'Ejecuta las órdenes que tiene asignadas', scope: 'PROPIO' },
  ALMACEN: { nombre: 'Almacenista', descripcion: 'Administra existencias y movimientos de kárdex', scope: 'SEDE' },
  SOLIC: { nombre: 'Solicitante', descripcion: 'Reporta fallas y sigue sus solicitudes', scope: 'PROPIO' },
  AUDITOR: { nombre: 'Auditor', descripcion: 'Consulta todo sin capacidad de escritura', scope: 'TENANT' },
};

/**
 * MATRIZ ROL × PERMISO aprobada.
 * El alcance (PROPIO/SEDE/TENANT) NO se codifica aquí: vive en `user_roles.scope`
 * y se aplica en la segunda mitad de `requirePermission`.
 */
export const ROLE_MATRIX: Record<RoleCode, readonly PermissionCode[]> = {
  ADMIN: PERMISSION_CODES,

  GERENTE: [
    'admin.usuarios.ver', 'admin.auditoria.ver',
    'infra.catalogos.ver', 'infra.catalogos.crear', 'infra.catalogos.editar', 'infra.catalogos.eliminar',
    'infra.tarifas.ver', 'infra.contratos.gestionar', 'infra.importar', 'infra.exportar',
    'activos.ver', 'activos.crear', 'activos.editar', 'activos.eliminar', 'activos.trasladar',
    'activos.costos.ver', 'activos.medidores.gestionar', 'activos.lecturas.registrar',
    'activos.documentos.gestionar', 'activos.qr.generar', 'activos.hoja_vida.ver', 'activos.importar', 'activos.exportar',
    'almacen.materiales.ver', 'almacen.materiales.gestionar', 'almacen.materiales.importar', 'almacen.materiales.exportar',
    'almacen.existencias.ver',
    'almacen.existencias.parametrizar', 'almacen.kardex.ver', 'almacen.kardex.ajustar',
    'almacen.kardex.anular', 'almacen.costos.ver', 'almacen.inventario.aprobar',
    'almacen.compras.solicitar', 'almacen.compras.aprobar',
    'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.aprobar',
    'solicitudes.rechazar', 'solicitudes.asignar', 'solicitudes.atender',
    'solicitudes.atencion_directa', 'solicitudes.convertir_ot', 'solicitudes.cerrar',
    'ordenes.ver', 'ordenes.crear', 'ordenes.editar', 'ordenes.eliminar', 'ordenes.planificar',
    'ordenes.asignar', 'ordenes.ejecutar', 'ordenes.tareas.registrar', 'ordenes.mano_obra.propia',
    'ordenes.mano_obra.terceros', 'ordenes.materiales.solicitar', 'ordenes.costos.ver',
    'ordenes.costos.editar', 'ordenes.liquidar', 'ordenes.cerrar', 'ordenes.reabrir',
    'ordenes.cancelar', 'ordenes.firmar.aprobador', 'ordenes.imprimir',
    'planes.ver', 'planes.gestionar', 'planes.activar', 'planes.generar_ot',
    'paros.ver', 'paros.registrar', 'paros.editar', 'paros.cerrar', 'paros.convertir_ot',
    'historia.ver', 'historia.enviar', 'historia.balance.calcular', 'historia.archivar',
    'reportes.dashboard.ver', 'reportes.operativos.ver', 'reportes.costos.ver',
    'reportes.exportar', 'reportes.programar',
    'combustibles.ver', 'combustibles.registrar', 'combustibles.editar',
    'bitacora.ver', 'bitacora.registrar', 'bitacora.eliminar',
    'tecnovigilancia.ver', 'tecnovigilancia.registrar', 'tecnovigilancia.reportar',
    'automatizador.ver', 'automatizador.gestionar', 'automatizador.bitacora.ver',
  ],

  PLANIF: [
    'infra.catalogos.ver', 'infra.catalogos.crear', 'infra.catalogos.editar',
    'infra.tarifas.ver', 'infra.contratos.gestionar', 'infra.importar', 'infra.exportar',
    'activos.ver', 'activos.crear', 'activos.editar', 'activos.trasladar', 'activos.costos.ver',
    'activos.medidores.gestionar', 'activos.lecturas.registrar', 'activos.documentos.gestionar',
    'activos.qr.generar', 'activos.hoja_vida.ver', 'activos.importar', 'activos.exportar',
    'almacen.materiales.ver', 'almacen.materiales.exportar', 'almacen.existencias.ver', 'almacen.kardex.ver',
    'almacen.costos.ver', 'almacen.compras.solicitar',
    'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.aprobar',
    'solicitudes.rechazar', 'solicitudes.asignar', 'solicitudes.atender',
    'solicitudes.atencion_directa', 'solicitudes.convertir_ot', 'solicitudes.cerrar',
    'ordenes.ver', 'ordenes.crear', 'ordenes.editar', 'ordenes.planificar', 'ordenes.asignar',
    'ordenes.ejecutar', 'ordenes.tareas.registrar', 'ordenes.mano_obra.propia',
    'ordenes.mano_obra.terceros', 'ordenes.materiales.solicitar', 'ordenes.costos.ver',
    'ordenes.liquidar', 'ordenes.cerrar', 'ordenes.cancelar', 'ordenes.firmar.aprobador',
    'ordenes.imprimir',
    'planes.ver', 'planes.gestionar', 'planes.activar', 'planes.generar_ot',
    'paros.ver', 'paros.registrar', 'paros.editar', 'paros.cerrar', 'paros.convertir_ot',
    'historia.ver', 'historia.balance.calcular',
    'reportes.dashboard.ver', 'reportes.operativos.ver', 'reportes.costos.ver',
    'reportes.exportar', 'reportes.programar',
    'combustibles.ver', 'combustibles.registrar', 'combustibles.editar',
    'bitacora.ver', 'bitacora.registrar',
    'tecnovigilancia.ver', 'tecnovigilancia.registrar',
    'automatizador.ver', 'automatizador.bitacora.ver',
  ],

  SUPERV: [
    'infra.catalogos.ver', 'infra.exportar',
    'activos.ver', 'activos.editar', 'activos.trasladar', 'activos.medidores.gestionar',
    'activos.lecturas.registrar', 'activos.documentos.gestionar', 'activos.qr.generar',
    'activos.hoja_vida.ver', 'activos.exportar',
    'almacen.materiales.ver', 'almacen.materiales.exportar', 'almacen.existencias.ver', 'almacen.kardex.ver', 'almacen.kardex.salida',
    'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.aprobar',
    'solicitudes.rechazar', 'solicitudes.asignar', 'solicitudes.atender',
    'solicitudes.atencion_directa', 'solicitudes.convertir_ot', 'solicitudes.cerrar',
    'ordenes.ver', 'ordenes.crear', 'ordenes.editar', 'ordenes.planificar', 'ordenes.asignar',
    'ordenes.ejecutar', 'ordenes.tareas.registrar', 'ordenes.mano_obra.propia',
    'ordenes.mano_obra.terceros', 'ordenes.materiales.solicitar', 'ordenes.costos.ver',
    'ordenes.cerrar', 'ordenes.firmar.ejecutor', 'ordenes.firmar.aprobador', 'ordenes.imprimir',
    'planes.ver',
    'paros.ver', 'paros.registrar', 'paros.editar', 'paros.cerrar', 'paros.convertir_ot',
    'historia.ver',
    'reportes.dashboard.ver', 'reportes.operativos.ver', 'reportes.exportar',
    'combustibles.ver', 'combustibles.registrar',
    'bitacora.ver', 'bitacora.registrar',
    'tecnovigilancia.ver', 'tecnovigilancia.registrar',
  ],

  TECNICO: [
    'infra.catalogos.ver',
    'activos.ver', 'activos.lecturas.registrar', 'activos.hoja_vida.ver',
    'almacen.materiales.ver', 'almacen.existencias.ver',
    'solicitudes.ver', 'solicitudes.crear', 'solicitudes.atender', 'solicitudes.atencion_directa',
    'ordenes.ver', 'ordenes.ejecutar', 'ordenes.tareas.registrar', 'ordenes.mano_obra.propia',
    'ordenes.materiales.solicitar', 'ordenes.firmar.ejecutor', 'ordenes.imprimir',
    'planes.ver',
    'paros.ver', 'paros.registrar',
    'reportes.dashboard.ver',
    'combustibles.ver', 'combustibles.registrar',
    'bitacora.ver', 'bitacora.registrar',
    'tecnovigilancia.registrar',
  ],

  ALMACEN: [
    'infra.catalogos.ver', 'infra.exportar',
    'activos.ver', 'activos.exportar',
    'almacen.materiales.ver', 'almacen.materiales.gestionar', 'almacen.materiales.importar', 'almacen.materiales.exportar', 'almacen.existencias.ver',
    'almacen.existencias.parametrizar', 'almacen.kardex.ver', 'almacen.kardex.entrada',
    'almacen.kardex.salida', 'almacen.kardex.confirmar', 'almacen.lotes.gestionar',
    'almacen.costos.ver', 'almacen.inventario.ejecutar', 'almacen.compras.solicitar',
    'solicitudes.crear',
    'ordenes.ver',
    'reportes.dashboard.ver', 'reportes.operativos.ver', 'reportes.exportar',
  ],

  SOLIC: ['activos.ver', 'solicitudes.ver', 'solicitudes.crear', 'solicitudes.editar', 'solicitudes.calificar'],

  AUDITOR: [
    'admin.usuarios.ver', 'admin.auditoria.ver',
    'infra.catalogos.ver', 'infra.tarifas.ver', 'infra.exportar',
    'activos.ver', 'activos.costos.ver', 'activos.hoja_vida.ver', 'activos.exportar',
    'almacen.materiales.ver', 'almacen.materiales.exportar', 'almacen.existencias.ver', 'almacen.kardex.ver', 'almacen.costos.ver',
    'solicitudes.ver',
    'ordenes.ver', 'ordenes.costos.ver', 'ordenes.imprimir',
    'planes.ver',
    'paros.ver',
    'bitacora.ver',
    'historia.ver',
    'reportes.dashboard.ver', 'reportes.operativos.ver', 'reportes.costos.ver', 'reportes.exportar',
    'combustibles.ver',
    'tecnovigilancia.ver',
    'automatizador.ver', 'automatizador.bitacora.ver',
  ],
};
