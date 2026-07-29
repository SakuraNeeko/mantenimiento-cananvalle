'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/datetime';
import type { ColumnMeta } from '@/components/data-table/types';

export type EventoRow = {
  id: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  tipo: 'EVENTO_ADVERSO' | 'INCIDENTE' | 'ALERTA_FABRICANTE';
  severidad: 'LEVE' | 'MODERADA' | 'GRAVE' | 'CRITICA' | null;
  estado: string;
  fecha: Date;
  reportadoAutoridad: boolean;
};

export const TIPO_LABELS: Record<EventoRow['tipo'], string> = {
  EVENTO_ADVERSO: 'Evento adverso',
  INCIDENTE: 'Incidente',
  ALERTA_FABRICANTE: 'Alerta de fabricante',
};

export const SEVERIDAD_LABELS: Record<NonNullable<EventoRow['severidad']>, string> = {
  LEVE: 'Leve',
  MODERADA: 'Moderada',
  GRAVE: 'Grave',
  CRITICA: 'Crítica',
};

export const SEVERIDAD_VARIANT: Record<NonNullable<EventoRow['severidad']>, 'neutral' | 'warning' | 'destructive'> = {
  LEVE: 'neutral',
  MODERADA: 'warning',
  GRAVE: 'destructive',
  CRITICA: 'destructive',
};

export const ESTADO_LABELS: Record<string, string> = { ABIERTO: 'Abierto', EN_GESTION: 'En gestión', CERRADO: 'Cerrado' };
export const ESTADO_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = { ABIERTO: 'warning', EN_GESTION: 'info', CERRADO: 'success' };

export const eventoColumns: ColumnDef<EventoRow, unknown>[] = [
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    meta: { label: 'Fecha', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDate(row.original.fecha)}</span>,
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
    cell: ({ row }) => <Badge variant="outline">{TIPO_LABELS[row.original.tipo]}</Badge>,
  },
  {
    accessorKey: 'severidad',
    header: 'Severidad',
    meta: { label: 'Severidad', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.severidad ? <Badge variant={SEVERIDAD_VARIANT[row.original.severidad]}>{SEVERIDAD_LABELS[row.original.severidad]}</Badge> : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
  {
    accessorKey: 'reportadoAutoridad',
    header: 'Reportado',
    meta: { label: 'Reportado', tipo: 'booleano', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.reportadoAutoridad ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>),
  },
];
