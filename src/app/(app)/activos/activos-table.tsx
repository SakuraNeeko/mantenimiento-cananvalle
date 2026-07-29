'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { activoColumns, type ActivoRow } from './columns';

export function ActivosTable({
  data,
  sort,
  filters,
  search,
  puedeCrear,
}: {
  data: TableResult<ActivoRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeCrear: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="activos"
      columns={activoColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/activos/${row.id}`)}
      acciones={
        puedeCrear ? (
          <Button size="sm" onClick={() => router.push('/activos/nuevo')}>
            <Plus aria-hidden />
            Nuevo activo
          </Button>
        ) : null
      }
      vacio={{
        titulo: 'Aún no hay activos',
        descripcion: 'Los activos son los equipos, vehículos e infraestructura que mantienes. Cada uno tiene su ficha técnica, medidores, documentos y hoja de vida.',
      }}
    />
  );
}
