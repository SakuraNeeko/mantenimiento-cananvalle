'use client';

import { useRouter } from 'next/navigation';
import { Gauge, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnFilter, SortRule, TableResult } from '@/components/data-table/types';
import { combustibleColumns, type CombustibleRow } from './columns';

export function CombustiblesTable({
  data,
  sort,
  filters,
  search,
  puedeRegistrar,
}: {
  data: TableResult<CombustibleRow>;
  sort: SortRule[];
  filters: ColumnFilter[];
  search: string;
  puedeRegistrar: boolean;
}) {
  const router = useRouter();

  return (
    <DataTable
      modulo="combustibles"
      columns={combustibleColumns}
      data={data}
      sort={sort}
      filters={filters}
      search={search}
      onRowClick={(row) => router.push(`/combustibles/${row.id}`)}
      acciones={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/combustibles/rendimiento')}>
            <Gauge aria-hidden />
            Rendimiento por activo
          </Button>
          {puedeRegistrar ? (
            <Button size="sm" onClick={() => router.push('/combustibles/nuevo')}>
              <Plus aria-hidden />
              Registrar carga
            </Button>
          ) : null}
        </div>
      }
      vacio={{ titulo: 'Sin cargas de combustible registradas', descripcion: 'Registra un abastecimiento para empezar a calcular rendimiento y detectar consumos anómalos.' }}
    />
  );
}
