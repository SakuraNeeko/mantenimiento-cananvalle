'use client';

import { movilDB } from './db';
import { encolarFoto, encolarOperacion } from './sync-manager';

/**
 * Cada acción del técnico hace dos cosas, siempre en este orden: (1) aplica
 * el cambio de inmediato sobre la copia local en IndexedDB, para que la
 * pantalla responda al toque sin esperar red — offline real, no un spinner
 * infinito — y (2) encola la misma operación para reproducirla contra el
 * servidor en cuanto vuelva la señal (`sync-manager.ts`).
 */

export async function completarTareaOffline(
  ordenId: string,
  tareaId: string,
  datos: { resultado?: string; valorMedido?: string; observacion?: string },
): Promise<void> {
  if (movilDB) {
    const orden = await movilDB.ordenes.get(ordenId);
    if (orden) {
      const tareas = orden.tareas.map((t) =>
        t.id === tareaId
          ? { ...t, resultado: datos.resultado ?? t.resultado, valorMedido: datos.valorMedido ?? t.valorMedido, observacion: datos.observacion ?? t.observacion, completadaAt: new Date().toISOString() }
          : t,
      );
      await movilDB.ordenes.put({ ...orden, tareas });
    }
  }
  await encolarOperacion({ tipo: 'TAREA', ordenId, tareaId, datos });
}

export async function subirFotoOffline(ordenId: string, tareaId: string, blob: Blob): Promise<void> {
  if (movilDB) {
    const orden = await movilDB.ordenes.get(ordenId);
    if (orden) {
      const previsualizacion = URL.createObjectURL(blob);
      const tareas = orden.tareas.map((t) => (t.id === tareaId ? { ...t, fotoUrl: previsualizacion } : t));
      await movilDB.ordenes.put({ ...orden, tareas });
    }
  }
  await encolarFoto(ordenId, tareaId, blob);
}

export async function firmarOffline(ordenId: string): Promise<void> {
  if (movilDB) {
    const orden = await movilDB.ordenes.get(ordenId);
    if (orden) await movilDB.ordenes.put({ ...orden, firmaEjecutorAt: new Date().toISOString() });
  }
  await encolarOperacion({ tipo: 'FIRMA', ordenId });
}

const ESTADO_TRAS_ACCION: Record<'iniciar' | 'pendiente' | 'reanudar' | 'ejecutada', string> = {
  iniciar: 'EN_EJECUCION',
  pendiente: 'PENDIENTE',
  reanudar: 'EN_EJECUCION',
  ejecutada: 'EJECUTADA',
};

export async function transicionOffline(
  ordenId: string,
  accion: 'iniciar' | 'pendiente' | 'reanudar' | 'ejecutada',
  extra?: { motivo?: string; causaPendienteId?: string },
): Promise<void> {
  if (movilDB) {
    const orden = await movilDB.ordenes.get(ordenId);
    if (orden) await movilDB.ordenes.put({ ...orden, estado: ESTADO_TRAS_ACCION[accion] });
  }
  await encolarOperacion({ tipo: 'TRANSICION', ordenId, accion, ...extra });
}

export async function comentarOffline(ordenId: string, mensaje: string): Promise<void> {
  await encolarOperacion({ tipo: 'COMENTARIO', ordenId, mensaje });
}
