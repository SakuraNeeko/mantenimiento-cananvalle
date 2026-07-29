'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { movimientoColumns, type MovimientoRow } from './columns';

export function KardexTable({
  data,
  sort,
  filters,
  search,
  puedeCrear,
}: {
  data: TableResult<MovimientoRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeCrear: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="kardex"
      columns={movimientoColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/almacen/kardex/${row.id}`)}
      acciones={
        puedeCrear ? (
          <Button size="sm" onClick={() => router.push('/almacen/kardex/nuevo')}>
            <Plus aria-hidden />
            Nuevo movimiento
          </Button>
        ) : null
      }
      vacio={{
        titulo: 'Aún no hay movimientos',
        descripcion: 'Los movimientos de entrada, salida y ajuste de existencias aparecerán aquí.',
      }}
    />
  );
}
