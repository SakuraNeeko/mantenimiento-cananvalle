'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDate } from '@/lib/datetime';
import { ESTADO_LABELS, ESTADO_VARIANT, PRIORIDAD_LABELS } from '@/lib/validators/orden';
import type { ColumnMeta } from '@/components/data-table/types';

export type OrdenRow = {
  id: string;
  consecutivo: string | null;
  descripcionProblema: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  criticidad: 'A' | 'B' | 'C';
  estado: string;
  assetNombre: string | null;
  responsableNombre: string | null;
  fechaProgramada: Date | null;
  createdAt: Date;
};

const PRIORIDAD_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'destructive'> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'destructive',
};

const CRITICIDAD_VARIANT: Record<string, 'destructive' | 'warning' | 'success'> = { A: 'destructive', B: 'warning', C: 'success' };

export const ordenColumns: ColumnDef<OrdenRow, unknown>[] = [
  {
    accessorKey: 'consecutivo',
    header: 'Consecutivo',
    meta: { label: 'Consecutivo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.consecutivo ?? 'Borrador'}</span>,
  },
  {
    accessorKey: 'descripcionProblema',
    header: 'Descripción',
    meta: { label: 'Descripción', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="line-clamp-1 max-w-md">{row.original.descripcionProblema}</span>,
  },
  {
    accessorKey: 'assetNombre',
    header: 'Activo',
    meta: { label: 'Activo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => row.original.assetNombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
    meta: { label: 'Prioridad', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={PRIORIDAD_VARIANT[row.original.prioridad]}>{PRIORIDAD_LABELS[row.original.prioridad]}</Badge>,
  },
  {
    accessorKey: 'criticidad',
    header: 'Criticidad',
    meta: { label: 'Criticidad', tipo: 'enum', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={CRITICIDAD_VARIANT[row.original.criticidad]}>{row.original.criticidad}</Badge>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
  {
    accessorKey: 'responsableNombre',
    header: 'Responsable',
    meta: { label: 'Responsable', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.responsableNombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'fechaProgramada',
    header: 'Fecha programada',
    meta: { label: 'Fecha programada', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDate(row.original.fechaProgramada)}</span>,
  },
];
