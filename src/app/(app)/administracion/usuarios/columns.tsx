'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import type { ColumnMeta } from '@/components/data-table/types';

export type UsuarioRow = {
  id: string;
  nombre: string;
  email: string;
  cargo: string | null;
  roles: string | null;
  sede: string | null;
  activo: boolean;
  lastLoginAt: Date | null;
};

export const usuarioColumns: ColumnDef<UsuarioRow, unknown>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    meta: { label: 'Nombre', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Correo',
    meta: { label: 'Correo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.email}</span>,
  },
  {
    accessorKey: 'cargo',
    header: 'Cargo',
    meta: { label: 'Cargo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => row.original.cargo ?? '—',
  },
  {
    accessorKey: 'roles',
    header: 'Roles',
    enableSorting: false,
    meta: { label: 'Roles', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {(row.original.roles ?? '')
          .split(',')
          .filter(Boolean)
          .map((r) => (
            <Badge key={r} variant="secondary">
              {r.trim()}
            </Badge>
          ))}
      </div>
    ),
  },
  {
    accessorKey: 'sede',
    header: 'Sede por defecto',
    meta: { label: 'Sede por defecto', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => row.original.sede ?? '—',
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'booleano' } satisfies ColumnMeta,
    cell: ({ row }) =>
      row.original.activo ? <Badge variant="success">Activo</Badge> : <Badge variant="neutral">Inactivo</Badge>,
  },
  {
    accessorKey: 'lastLoginAt',
    header: 'Último acceso',
    meta: { label: 'Último acceso', tipo: 'fecha', align: 'right' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.lastLoginAt)}</span>,
  },
];
