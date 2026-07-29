'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT, PRIORIDAD_LABELS } from '@/lib/validators/orden';
import type { OrdenRow } from './columns';

const COLUMNAS_ESTADO = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA', 'LIQUIDADA'] as const;

const PRIORIDAD_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'destructive'> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'destructive',
};

export function KanbanBoard({ rows }: { rows: OrdenRow[] }) {
  const router = useRouter();

  const columnas = COLUMNAS_ESTADO.map((estado) => ({
    estado,
    ordenes: rows.filter((r) => r.estado === estado),
  }));

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {columnas.map(({ estado, ordenes }) => (
        <div key={estado} className="flex w-72 shrink-0 flex-col rounded-[8px] border bg-muted/20">
          <div className="flex items-center justify-between border-b p-2">
            <Badge variant={ESTADO_VARIANT[estado] ?? 'neutral'}>{ESTADO_LABELS[estado] ?? estado}</Badge>
            <span className="text-2xs text-muted-foreground">{ordenes.length}</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {ordenes.length === 0 ? (
              <p className="p-2 text-center text-2xs text-muted-foreground">Sin órdenes</p>
            ) : (
              ordenes.map((orden) => (
                <button
                  key={orden.id}
                  type="button"
                  onClick={() => router.push(`/ordenes/${orden.id}`)}
                  className="w-full space-y-1.5 rounded-[6px] border bg-background p-2 text-left text-sm shadow-sm transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-codigo text-xs">{orden.consecutivo ?? 'Borrador'}</span>
                    <Badge variant={PRIORIDAD_VARIANT[orden.prioridad]}>{PRIORIDAD_LABELS[orden.prioridad]}</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs">{orden.descripcionProblema}</p>
                  {orden.assetNombre ? <p className="text-2xs text-muted-foreground">{orden.assetNombre}</p> : null}
                  <div className="flex items-center justify-between text-2xs text-muted-foreground">
                    <span>{orden.responsableNombre ?? 'Sin asignar'}</span>
                    {orden.fechaProgramada ? <span>{fmtDate(orden.fechaProgramada)}</span> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
