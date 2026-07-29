'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime } from '@/lib/datetime';
import { ESTADO_LABELS, PRIORIDAD_LABELS } from '@/lib/validators/solicitud';
import type { ColumnMeta } from '@/components/data-table/types';

export type SolicitudRow = {
  id: string;
  consecutivo: string | null;
  fecha: Date;
  descripcion: string;
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  estado: string;
  solicitanteNombre: string;
  responsableNombre: string | null;
};

const PRIORIDAD_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'destructive'> = {
  BAJA: 'neutral',
  MEDIA: 'info',
  ALTA: 'warning',
  URGENTE: 'destructive',
};

const ESTADO_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'info' | 'neutral'> = {
  BORRADOR: 'neutral',
  ENVIADA: 'info',
  EN_REVISION: 'info',
  APROBADA: 'info',
  RECHAZADA: 'destructive',
  ASIGNADA: 'warning',
  EN_ATENCION: 'warning',
  RESUELTA: 'success',
  CERRADA: 'neutral',
  CONVERTIDA_EN_OT: 'success',
};

export const solicitudColumns: ColumnDef<SolicitudRow, unknown>[] = [
  {
    accessorKey: 'consecutivo',
    header: 'Consecutivo',
    meta: { label: 'Consecutivo', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="font-codigo text-xs">{row.original.consecutivo ?? 'Borrador'}</span>,
  },
  {
    accessorKey: 'descripcion',
    header: 'Descripción',
    meta: { label: 'Descripción', tipo: 'texto' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="line-clamp-1 max-w-md">{row.original.descripcion}</span>,
  },
  {
    accessorKey: 'prioridad',
    header: 'Prioridad',
    meta: { label: 'Prioridad', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={PRIORIDAD_VARIANT[row.original.prioridad]}>{PRIORIDAD_LABELS[row.original.prioridad]}</Badge>,
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    meta: { label: 'Estado', tipo: 'enum' } satisfies ColumnMeta,
    cell: ({ row }) => <Badge variant={ESTADO_VARIANT[row.original.estado] ?? 'neutral'}>{ESTADO_LABELS[row.original.estado] ?? row.original.estado}</Badge>,
  },
  {
    accessorKey: 'solicitanteNombre',
    header: 'Solicitante',
    meta: { label: 'Solicitante', tipo: 'texto' } satisfies ColumnMeta,
  },
  {
    accessorKey: 'responsableNombre',
    header: 'Responsable',
    meta: { label: 'Responsable', tipo: 'texto', ocultaPorDefecto: true } satisfies ColumnMeta,
    cell: ({ row }) => row.original.responsableNombre ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: 'fecha',
    header: 'Fecha',
    meta: { label: 'Fecha', tipo: 'fecha' } satisfies ColumnMeta,
    cell: ({ row }) => <span className="tabular text-xs">{fmtDateTime(row.original.fecha)}</span>,
  },
];
