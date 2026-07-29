'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { fmtDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/utils';
import type { ColumnMeta } from '@/components/data-table/types';

export type CombustibleRow = {
  id: string;
  fecha: Date;
  assetCodigo: string | null;
  assetNombre: string | null;
  fuelNombre: string | null;
  cantidad: string;
  costoTotal: string;
  lectura: string | null;
  numeroFactura: string | null;
};

export const combustibleColumns: ColumnDef<CombustibleRow, unknown>[] = [
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
    accessorKey: 'fuelNombre',
    header: 'Combustible',
    meta: { label: 'Combustible', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'cantidad',
    header: 'Cantidad',
    meta: { label: 'Cantidad', tipo: 'numero', align: 'right' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-right">{row.original.cantidad}</span>,
  },
  {
    accessorKey: 'costoTotal',
    header: 'Costo total',
    meta: { label: 'Costo total', tipo: 'moneda', align: 'right' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-right">{formatMoney(row.original.costoTotal)}</span>,
  },
  {
    accessorKey: 'lectura',
    header: 'Lectura',
    meta: { label: 'Lectura', tipo: 'numero', align: 'right', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.lectura ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'numeroFactura',
    header: 'Factura',
    meta: { label: 'Factura', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.numeroFactura ?? <span className="text-muted-foreground">—</span>,
  },
];
