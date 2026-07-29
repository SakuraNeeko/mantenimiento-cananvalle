'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TIPO_MATERIAL_LABELS } from '@/lib/validators/material';
import type { ColumnMeta } from '@/components/data-table/types';

export type MaterialRow = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  categoria: string | null;
  critico: boolean;
  activo: boolean;
  bajoMinimo: boolean;
};

export const materialColumns: ColumnDef<MaterialRow, unknown>[] = [
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
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 font-medium">
        {row.original.bajoMinimo ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Bajo mínimo en algún almacén" /> : null}
        {row.original.nombre}
      </span>
    ),
  },
  {
    accessorKey: 'tipo',
    header: 'Tipo',
    meta: { label: 'Tipo', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => TIPO_MATERIAL_LABELS[row.original.tipo as keyof typeof TIPO_MATERIAL_LABELS] ?? row.original.tipo,
  },
  {
    accessorKey: 'categoria',
    header: 'Categoría',
    meta: { label: 'Categoría', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => row.original.categoria ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'critico',
    header: 'Crítico',
    meta: { label: 'Crítico', tipo: 'booleano', align: 'center' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.critico ? <Badge variant="destructive">Sí</Badge> : <Badge variant="neutral">No</Badge>),
  },
  {
    accessorKey: 'activo',
    header: 'Activo',
    meta: { label: 'Activo', tipo: 'booleano' } satisfies ColumnMeta,
    cell: ({ row }) => (row.original.activo ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>),
  },
];
