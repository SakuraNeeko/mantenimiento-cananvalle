'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { paroColumns, type ParoRow } from './columns';

export function ParosTable({
  data,
  sort,
  filters,
  search,
  puedeRegistrar,
}: {
  data: TableResult<ParoRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeRegistrar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="paros"
      columns={paroColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/paros/${row.id}`)}
      acciones={
        puedeRegistrar ? (
          <Button size="sm" onClick={() => router.push('/paros/nuevo')}>
            <Plus aria-hidden />
            Registrar paro
          </Button>
        ) : null
      }
      vacio={{ titulo: 'Sin paros registrados', descripcion: 'Cuando un activo se detenga, programada o inesperadamente, regístralo aquí.' }}
    />
  );
}
