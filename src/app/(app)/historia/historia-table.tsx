'use client';

import { useRouter } from 'next/navigation';
import { Archive, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { historiaColumns, type HistoriaRow } from './columns';

export function HistoriaTable({
  data,
  sort,
  filters,
  search,
  puedeEnviar,
  puedeArchivar,
}: {
  data: TableResult<HistoriaRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeEnviar: boolean;
  puedeArchivar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="historia"
      columns={historiaColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/historia/${row.id}`)}
      acciones={
        <div className="flex items-center gap-2">
          {puedeArchivar ? (
            <Button variant="outline" size="sm" onClick={() => router.push('/historia/archivo')}>
              <Archive aria-hidden />
              Archivo
            </Button>
          ) : null}
          {puedeEnviar ? (
            <Button size="sm" onClick={() => router.push('/historia/enviar')}>
              <Send aria-hidden />
              Enviar OT cerradas
            </Button>
          ) : null}
        </div>
      }
      vacio={{ titulo: 'Todavía no hay historia', descripcion: 'Cuando envíes órdenes de trabajo cerradas a historia, aparecerán aquí como copia inmutable.' }}
    />
  );
}
