'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import type { ColumnMeta } from '@/components/data-table/types';

export type MovimientoRow = {
  id: string;
  consecutivo: string | null;
  fecha: Date;
  estado: string;
  conceptoNombre: string;
  signo: 'ENTRADA' | 'SALIDA';
  warehouseNombre: string;
  partyNombre: string | null;
};

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  BORRADOR: 'warning',
  CONFIRMADO: 'success',
  ANULADO: 'destructive',
};
const ESTADO_LABELS: Record<string, string> = { BORRADOR: 'Borrador', CONFIRMADO: 'Confirmado', ANULADO: 'Anulado' };

export const movimientoColumns: ColumnDef<MovimientoRow, unknown>[] = [
  {
    accessorKey: 'consecutivo',
    header: 'Consecutivo',
    meta: { label: 'Consecutivo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.consecutivo ?? '—'}</span>,
  },
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    meta: { label: 'Fecha', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.fecha)}</span>,
  },
  {
    accessorKey: 'conceptoNombre',
    header: 'Concepto',
    meta: { label: 'Concepto', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => (
      <span>
        {row.original.conceptoNombre} <span className={row.original.signo === 'ENTRADA' ? 'text-success' : 'text-destructive'}>({row.original.signo === 'ENTRADA' ? '+' : '−'})</span>
      </span>
    ),
  },
  {
    accessorKey: 'warehouseNombre',
    header: 'Almacén',
    meta: { label: 'Almacén', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'partyNombre',
    header: 'Tercero',
    meta: { label: 'Tercero', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.partyNombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
];
