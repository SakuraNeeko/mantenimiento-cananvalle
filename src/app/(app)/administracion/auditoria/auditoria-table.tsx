'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { auditoriaColumns, type AuditoriaRow } from './columns';

export function AuditoriaTable({
  data,
  sort,
  filters,
  search,
}: {
  data: TableResult<AuditoriaRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
}) {
  return (
    <DataTable
      modulo="auditoria"
      columns={auditoriaColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      vacio={{
        titulo: 'Sin eventos registrados',
        descripcion:
          'La bitácora guarda cada creación, modificación y eliminación, junto con el usuario, la dirección IP y el permiso ejercido.',
      }}
    />
  );
}
