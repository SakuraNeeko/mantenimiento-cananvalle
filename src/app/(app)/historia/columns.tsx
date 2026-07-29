'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import type { ColumnMeta } from '@/components/data-table/types';

export type HistoriaRow = {
  id: string;
  consecutivo: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  origen: string;
  fechaFinReal: Date | null;
  costoTotal: string;
  causaCierreNombre: string | null;
};

const ORIGEN_LABELS: Record<string, string> = { MANUAL: 'Manual', PLAN: 'Plan', SS: 'Solicitud', PARO: 'Paro' };

export const historiaColumns: ColumnDef<HistoriaRow, unknown>[] = [
  {
    accessorKey: 'consecutivo',
    header: 'Consecutivo',
    meta: { label: 'Consecutivo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.consecutivo}</span>,
  },
  {
    accessorKey: 'assetNombre',
    header: 'Activo',
    meta: { label: 'Activo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.assetCodigo && row.original.assetNombre ? `${row.original.assetCodigo} — ${row.original.assetNombre}` : row.original.assetNombre),
  },
  {
    accessorKey: 'origen',
    header: 'Origen',
    meta: { label: 'Origen', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant="neutral">{ORIGEN_LABELS[row.original.origen] ?? row.original.origen}</Badge>,
  },
  {
    accessorKey: 'fechaFinReal',
    header: 'Cerrada',
    meta: { label: 'Cerrada', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDate(row.original.fechaFinReal)}</span>,
  },
  {
    accessorKey: 'costoTotal',
    header: 'Costo total',
    meta: { label: 'Costo total', tipo: 'moneda', align: 'right' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-right">{formatMoney(row.original.costoTotal)}</span>,
  },
  {
    accessorKey: 'causaCierreNombre',
    header: 'Causa de cierre',
    meta: { label: 'Causa de cierre', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.causaCierreNombre ?? <span className="text-muted-foreground">—</span>,
  },
];
