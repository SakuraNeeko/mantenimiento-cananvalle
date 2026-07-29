'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { solicitudColumns, type SolicitudRow } from './columns';

export function SolicitudesTable({
  data,
  sort,
  filters,
  search,
  puedeCrear,
}: {
  data: TableResult<SolicitudRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeCrear: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="solicitudes"
      columns={solicitudColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/solicitudes/${row.id}`)}
      acciones={
        puedeCrear ? (
          <Button size="sm" onClick={() => router.push('/solicitudes/nueva')}>
            <Plus aria-hidden />
            Nueva solicitud
          </Button>
        ) : null
      }
      vacio={{
        titulo: 'Aún no hay solicitudes',
        descripcion: 'Cuando alguien reporte una falla o pida un trabajo, aparecerá aquí.',
      }}
    />
  );
}
