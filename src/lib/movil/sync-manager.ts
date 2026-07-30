'use client';

import * as React from 'react';
import { liveQuery } from 'dexie';
import { movilDB } from './db';
import type { NuevaOperacionCola, OperacionCola } from './tipos';
import { procesarOperacionCola, subirFotoTareaMovil } from '@/app/movil/_lib/sync-actions';

/** Encola una operación offline-first: se guarda de inmediato en IndexedDB y se intenta sincronizar si hay señal. */
export async function encolarOperacion(op: NuevaOperacionCola): Promise<void> {
  const dexie = movilDB;
  if (!dexie) return;
  const completa = { ...op, id: crypto.randomUUID(), creadaEn: new Date().toISOString() } as OperacionCola;
  await dexie.cola.add(completa);
  if (navigator.onLine) void sincronizarCola();
}

/** Encola una foto de evidencia capturada offline (Blob, no viaja por la cola de texto). */
export async function encolarFoto(ordenId: string, tareaId: string, blob: Blob): Promise<void> {
  if (!movilDB) return;
  await movilDB.colaFotos.add({ id: crypto.randomUUID(), ordenId, tareaId, blob, creadaEn: new Date().toISOString() });
  if (navigator.onLine) void sincronizarCola();
}

let sincronizando = false;

/** Reproduce, en orden de creación, todo lo que esté pendiente. Sin candado global no habría forma de evitar dos drenados simultáneos (p.ej. un evento 'online' y un clic en "Sincronizar ahora" a la vez). */
export async function sincronizarCola(): Promise<{ ok: number; error: number; conflictos: number }> {
  const resumen = { ok: 0, error: 0, conflictos: 0 };
  if (!movilDB || sincronizando || !navigator.onLine) return resumen;

  sincronizando = true;
  try {
    const operaciones = await movilDB.cola.orderBy('creadaEn').toArray();
    for (const op of operaciones) {
      try {
        const resultado = await procesarOperacionCola(op);
        if (resultado.ok) {
          if (resultado.conflicto) resumen.conflictos++;
          resumen.ok++;
          await movilDB.cola.delete(op.id);
        } else {
          resumen.error++;
        }
      } catch {
        resumen.error++;
      }
    }

    const fotos = await movilDB.colaFotos.orderBy('creadaEn').toArray();
    for (const foto of fotos) {
      try {
        const formData = new FormData();
        formData.set('file', foto.blob, `${foto.tareaId}.jpg`);
        const resultado = await subirFotoTareaMovil(foto.ordenId, foto.tareaId, formData);
        if (resultado.ok) {
          resumen.ok++;
          await movilDB.colaFotos.delete(foto.id);
        } else {
          resumen.error++;
        }
      } catch {
        resumen.error++;
      }
    }
  } finally {
    sincronizando = false;
  }

  return resumen;
}

/** Cantidad de operaciones + fotos pendientes de subir, reactivo (Dexie `liveQuery`, sin depender de `dexie-react-hooks`). */
export function usePendientesSync(): number {
  const [pendientes, setPendientes] = React.useState(0);

  React.useEffect(() => {
    const dexie = movilDB;
    if (!dexie) return;
    const sub = liveQuery(async () => {
      const [a, b] = await Promise.all([dexie.cola.count(), dexie.colaFotos.count()]);
      return a + b;
    }).subscribe({ next: setPendientes });
    return () => sub.unsubscribe();
  }, []);

  return pendientes;
}

/** Registra los disparadores automáticos de sincronización: al recuperar señal y cada 60s mientras haya conexión. */
export function iniciarAutoSync(): () => void {
  const alVolverOnline = () => void sincronizarCola();
  window.addEventListener('online', alVolverOnline);
  const intervalo = window.setInterval(() => {
    if (navigator.onLine) void sincronizarCola();
  }, 60_000);

  return () => {
    window.removeEventListener('online', alVolverOnline);
    window.clearInterval(intervalo);
  };
}
