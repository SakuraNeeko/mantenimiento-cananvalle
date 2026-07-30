'use client';

import * as React from 'react';
import Link from 'next/link';
import { liveQuery } from 'dexie';
import { WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { ESTADO_LABELS, ESTADO_VARIANT, PRIORIDAD_LABELS } from '@/lib/validators/orden';
import { movilDB } from '@/lib/movil/db';
import type { OrdenCacheada } from '@/lib/movil/tipos';

/** Lista offline-first: siempre pinta desde IndexedDB, no directo de la prop del servidor — así una OT recién cambiada localmente (checklist, firma) se ve reflejada de inmediato, sin esperar a la sincronización. */
export function MisOrdenesClient({ ordenesIniciales }: { ordenesIniciales: OrdenCacheada[] }) {
  const [ordenes, setOrdenes] = React.useState<OrdenCacheada[]>(ordenesIniciales);
  const [sinConexion, setSinConexion] = React.useState(false);

  React.useEffect(() => {
    const dexie = movilDB;
    if (!dexie) return;
    if (ordenesIniciales.length > 0 || navigator.onLine) {
      void dexie.ordenes.bulkPut(ordenesIniciales);
    }
    // `navigator.onLine` no existe en SSR: solo puede leerse tras montar, suscrito a IndexedDB (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSinConexion(!navigator.onLine);

    const sub = liveQuery(() => dexie.ordenes.toArray()).subscribe({
      next: (filas) => setOrdenes([...filas].sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? ''))),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <PageHeader titulo="Mis OT" descripcion="Órdenes asignadas a ti. El checklist funciona incluso sin señal." />

      {sinConexion ? (
        <div className="flex items-center gap-2 rounded-[8px] border border-warning/30 bg-warning/10 p-2 text-2xs text-warning-foreground">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Sin conexión — viendo la última copia guardada en este dispositivo.
        </div>
      ) : null}

      {ordenes.length === 0 ? (
        <EmptyState titulo="No tienes órdenes asignadas" descripcion="Cuando te asignen una OT, aparecerá aquí — puedes trabajarla incluso sin señal." />
      ) : (
        <div className="space-y-2">
          {ordenes.map((ot) => {
            const tareasCompletadas = ot.tareas.filter((t) => t.completadaAt).length;
            return (
              <Link key={ot.id} href={`/movil/ordenes/${ot.id}`}>
                <Card className="min-h-[44px] transition-colors active:bg-accent/50">
                  <CardContent className="space-y-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-codigo text-2xs text-muted-foreground">{ot.consecutivo ?? 'Sin consecutivo'}</span>
                      <Badge variant={ESTADO_VARIANT[ot.estado] ?? 'neutral'}>{ESTADO_LABELS[ot.estado] ?? ot.estado}</Badge>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium">{ot.descripcionProblema}</p>
                    <p className="text-2xs text-muted-foreground">
                      {ot.assetNombre ?? 'Sin activo'} · {PRIORIDAD_LABELS[ot.prioridad as keyof typeof PRIORIDAD_LABELS] ?? ot.prioridad}
                    </p>
                    {ot.tareas.length > 0 ? (
                      <p className="text-2xs text-muted-foreground">
                        Checklist: {tareasCompletadas}/{ot.tareas.length}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
