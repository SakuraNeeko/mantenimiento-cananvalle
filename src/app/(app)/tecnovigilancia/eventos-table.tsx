'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { eventoColumns, type EventoRow } from './columns';

export function EventosTable({
  data,
  sort,
  filters,
  search,
  puedeRegistrar,
}: {
  data: TableResult<EventoRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeRegistrar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="tecnovigilancia"
      columns={eventoColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/tecnovigilancia/${row.id}`)}
      acciones={
        puedeRegistrar ? (
          <Button size="sm" onClick={() => router.push('/tecnovigilancia/nuevo')}>
            <Plus aria-hidden />
            Registrar evento
          </Button>
        ) : null
      }
      vacio={{ titulo: 'Sin eventos registrados', descripcion: 'Registra un evento adverso, incidente o alerta de fabricante para un equipo biomédico.' }}
    />
  );
}
