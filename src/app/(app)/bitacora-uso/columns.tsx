'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT } from '@/lib/validators/bitacora';
import type { ColumnMeta } from '@/components/data-table/types';

export type BitacoraRow = {
  id: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  responsableNombre: string | null;
  proposito: string;
  estado: string;
  fechaSalida: Date;
  fechaRegreso: Date | null;
};

export const bitacoraColumns: ColumnDef<BitacoraRow, unknown>[] = [
  {
    accessorKey: 'assetNombre',
    header: 'Activo',
    meta: { label: 'Activo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.assetCodigo && row.original.assetNombre ? `${row.original.assetCodigo} — ${row.original.assetNombre}` : row.original.assetNombre),
  },
  {
    accessorKey: 'responsableNombre',
    header: 'Responsable',
    meta: { label: 'Responsable', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'proposito',
    header: 'Propósito',
    meta: { label: 'Propósito', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
  {
    accessorKey: 'fechaSalida',
    header: 'Salida',
    meta: { label: 'Salida', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.fechaSalida)}</span>,
  },
  {
    accessorKey: 'fechaRegreso',
    header: 'Regreso',
    meta: { label: 'Regreso', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.fechaRegreso ? <span className="tabular text-xs">{fmtDateTime(row.original.fechaRegreso)}</span> : <span className="text-muted-foreground">—</span>),
  },
];
