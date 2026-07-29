'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CLASE_LABELS, ESTADO_LABELS } from '@/lib/validators/activo';
import type { ColumnMeta } from '@/components/data-table/types';

export type ActivoRow = {
  id: string;
  codigo: string;
  nombre: string;
  clase: string;
  estado: string;
  criticidad: 'A' | 'B' | 'C';
  ubicacion: string | null;
  centroCosto: string | null;
  activo: boolean;
};

const CRITICIDAD_VARIANT = { A: 'destructive', B: 'warning', C: 'success' } as const;
const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'neutral'> = {
  OPERATIVO: 'success',
  EN_MANTENIMIENTO: 'warning',
  FUERA_DE_SERVICIO: 'destructive',
  DADO_DE_BAJA: 'neutral',
};

export const activoColumns: ColumnDef<ActivoRow, unknown>[] = [
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
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: 'clase',
    header: 'Clase',
    meta: { label: 'Clase', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => CLASE_LABELS[row.original.clase as keyof typeof CLASE_LABELS] ?? row.original.clase,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => (
      <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>
    ),
  },
  {
    accessorKey: 'criticidad',
    header: 'Criticidad',
    meta: { label: 'Criticidad', tipo: 'enum', align: 'center' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={CRITICIDAD_VARIANT[row.original.criticidad]}>{row.original.criticidad}</Badge>,
  },
  {
    accessorKey: 'ubicacion',
    header: 'Ubicación',
    meta: { label: 'Ubicación', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => row.original.ubicacion ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'centroCosto',
    header: 'Centro de costo',
    meta: { label: 'Centro de costo', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.centroCosto ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'activo',
    header: 'Visible',
    meta: { label: 'Visible', tipo: 'booleano' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.activo ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>),
  },
];
