/**
 * Tipos compartidos entre el cliente offline (Dexie/IndexedDB) y las Server
 * Actions que reproducen la cola cuando vuelve la conexión. Deliberadamente
 * planos y serializables — cruzan el límite servidor↔cliente todo el tiempo.
 */

export type TareaCacheada = {
  id: string;
  orden: number;
  descripcion: string;
  tipoRespuesta: 'OK_NO_OK' | 'NUMERICO' | 'TEXTO' | 'FOTO' | 'FIRMA';
  esCritica: boolean;
  resultado: string | null;
  valorMedido: string | null;
  observacion: string | null;
  fotoUrl: string | null;
  completadaAt: string | null;
};

export type OrdenCacheada = {
  id: string;
  consecutivo: string | null;
  descripcionProblema: string;
  estado: string;
  prioridad: string;
  criticidad: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  fechaProgramada: string | null;
  firmaEjecutorAt: string | null;
  tareas: TareaCacheada[];
  actualizadoEn: string;
};

export type OperacionCola =
  | { id: string; tipo: 'TAREA'; ordenId: string; tareaId: string; datos: { resultado?: string; valorMedido?: string; observacion?: string }; creadaEn: string }
  | { id: string; tipo: 'COMENTARIO'; ordenId: string; mensaje: string; creadaEn: string }
  | { id: string; tipo: 'FIRMA'; ordenId: string; creadaEn: string }
  | { id: string; tipo: 'TRANSICION'; ordenId: string; accion: 'iniciar' | 'pendiente' | 'reanudar' | 'ejecutada'; motivo?: string; causaPendienteId?: string; creadaEn: string };

export type ResultadoSync = { ok: true; conflicto?: boolean } | { ok: false; error: string };

/**
 * `Omit` no distribuye sobre uniones: `Omit<OperacionCola, 'id'|'creadaEn'>`
 * colapsaría los cuatro variantes a solo sus campos comunes, perdiendo
 * `tareaId`/`mensaje`/`accion` de cada una. Esta versión sí distribuye.
 */
type SinIdNiFecha<T> = T extends unknown ? Omit<T, 'id' | 'creadaEn'> : never;
export type NuevaOperacionCola = SinIdNiFecha<OperacionCola>;
