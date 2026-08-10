'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { bitacoraColumns, type BitacoraRow } from './columns';

export function BitacoraTable({
  data,
  sort,
  filters,
  search,
  puedeRegistrar,
}: {
  data: TableResult<BitacoraRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeRegistrar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="bitacora-uso"
      columns={bitacoraColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/bitacora-uso/${row.id}`)}
      acciones={
        puedeRegistrar ? (
          <Button size="sm" onClick={() => router.push('/bitacora-uso/nueva')}>
            <Plus aria-hidden />
            Registrar salida
          </Button>
        ) : null
      }
      vacio={{ titulo: 'Sin usos registrados', descripcion: 'Cuando alguien saque un vehículo o equipo, regístralo aquí con foto y lectura del medidor.' }}
    />
  );
}
