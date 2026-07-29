'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { ALCANCE_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/plan';
import type { ColumnMeta } from '@/components/data-table/types';

export type PlanRow = {
  id: string;
  codigo: string;
  nombre: string;
  alcance: 'ACTIVO_UNICO' | 'GRUPO';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  activo: boolean;
  assetNombre: string | null;
  maintenanceTypeNombre: string | null;
};

const PRIORIDAD_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'destructive'> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'destructive',
};

export const planColumns: ColumnDef<PlanRow, unknown>[] = [
  {
    accessorKey: 'codigo',
    header: 'Código',
    meta: { label: 'Código', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.codigo}</span>,
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    meta: { label: 'Nombre', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'alcance',
    header: 'Alcance',
    meta: { label: 'Alcance', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.alcance === 'ACTIVO_UNICO' ? (row.original.assetNombre ?? ALCANCE_LABELS.ACTIVO_UNICO) : ALCANCE_LABELS.GRUPO),
  },
  {
    accessorKey: 'maintenanceTypeNombre',
    header: 'Tipo de mantenimiento',
    meta: { label: 'Tipo de mantenimiento', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.maintenanceTypeNombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
    meta: { label: 'Prioridad', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={PRIORIDAD_VARIANT[row.original.prioridad]}>{PRIORIDAD_LABELS[row.original.prioridad]}</Badge>,
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'booleano' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={row.original.activo ? 'success' : 'neutral'}>{row.original.activo ? 'Activo' : 'Inactivo'}</Badge>,
  },
];
