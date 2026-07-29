'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import type { ColumnMeta } from '@/components/data-table/types';

export type AuditoriaRow = {
  id: number;
  entidad: string;
  entidadId: string | null;
  accion: string;
  nivel: 'INFO' | 'CRITICO';
  permiso: string | null;
  userEmail: string | null;
  ip: string | null;
  diff: unknown;
  createdAt: Date;
};

export const auditoriaColumns: ColumnDef<AuditoriaRow, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    meta: { label: 'Fecha', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'nivel',
    header: 'Nivel',
    meta: {
      label: 'Nivel',
      tipo: 'enum',
      opciones: [
        { value: 'INFO', label: 'Informativo' },
        { value: 'CRITICO', label: 'Crítico' },
      ],
    } satisfies ColumnMeta,
    cell: ({ row }) =>
      row.original.nivel === 'CRITICO' ? (
        <Badge variant="destructive">Crítico</Badge>
      ) : (
        <Badge variant="neutral">Info</Badge>
      ),
  },
  {
    accessorKey: 'accion',
    header: 'Acción',
    meta: { label: 'Acción', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant="secondary">{row.original.accion}</Badge>,
  },
  {
    accessorKey: 'entidad',
    header: 'Entidad',
    meta: { label: 'Entidad', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'permiso',
    header: 'Permiso',
    meta: { label: 'Permiso', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-2xs">{row.original.permiso ?? '—'}</span>,
  },
  {
    accessorKey: 'userEmail',
    header: 'Usuario',
    meta: { label: 'Usuario', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-2xs">{row.original.userEmail ?? 'sistema'}</span>,
  },
  {
    accessorKey: 'ip',
    header: 'Origen',
    meta: { label: 'Origen', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-2xs">{row.original.ip ?? '—'}</span>,
  },
];
