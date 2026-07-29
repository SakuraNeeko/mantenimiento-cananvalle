'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT, TIPO_LABELS } from '@/lib/validators/paro';
import type { ColumnMeta } from '@/components/data-table/types';

export type ParoRow = {
  id: string;
  consecutivo: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  tipo: 'PROGRAMADO' | 'NO_PROGRAMADO';
  estado: string;
  fechaInicio: Date;
  fechaFin: Date | null;
  duracionMinutos: string | null;
  responsableNombre: string | null;
};

const TIPO_VARIANT: Record<string, 'neutral' | 'destructive'> = { PROGRAMADO: 'neutral', NO_PROGRAMADO: 'destructive' };

export const paroColumns: ColumnDef<ParoRow, unknown>[] = [
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
    accessorKey: 'tipo',
    header: 'Tipo',
    meta: { label: 'Tipo', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={TIPO_VARIANT[row.original.tipo]}>{TIPO_LABELS[row.original.tipo]}</Badge>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
  {
    accessorKey: 'fechaInicio',
    header: 'Inicio',
    meta: { label: 'Inicio', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.fechaInicio)}</span>,
  },
  {
    accessorKey: 'duracionMinutos',
    header: 'Duración',
    meta: { label: 'Duración', tipo: 'numero', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.duracionMinutos ? `${Math.round(Number(row.original.duracionMinutos))} min` : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: 'responsableNombre',
    header: 'Reportado por',
    meta: { label: 'Reportado por', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
  },
];
