import Dexie, { type EntityTable } from 'dexie';
import type { OperacionCola, OrdenCacheada } from './tipos';

/** Foto capturada offline, pendiente de subir — Blob, no se serializa como el resto de la cola. */
export type FotoEnCola = {
  id: string;
  ordenId: string;
  tareaId: string;
  blob: Blob;
  creadaEn: string;
};

/**
 * Base offline del técnico (IndexedDB vía Dexie). Vive solo en el navegador:
 * `ordenes` es el espejo de las OT asignadas para poder abrir el checklist
 * sin señal; `cola` y `colaFotos` son las escrituras pendientes de reproducir
 * contra el servidor en cuanto vuelva la conexión (§"Experiencia móvil").
 */
class MovilDB extends Dexie {
  ordenes!: EntityTable<OrdenCacheada, 'id'>;
  cola!: EntityTable<OperacionCola, 'id'>;
  colaFotos!: EntityTable<FotoEnCola, 'id'>;

  constructor() {
    super('gmao-movil');
    this.version(1).stores({
      ordenes: 'id, estado',
      cola: 'id, ordenId, creadaEn',
      colaFotos: 'id, ordenId, tareaId, creadaEn',
    });
  }
}

/** `undefined` en el servidor: Dexie necesita `indexedDB`, que no existe en SSR. Solo usar detrás de un `typeof window !== 'undefined'`. */
export const movilDB: MovilDB | undefined = typeof window !== 'undefined' ? new MovilDB() : undefined;
